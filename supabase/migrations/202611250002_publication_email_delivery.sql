create table if not exists public.publication_email_settings (
  id boolean primary key default true check (id),
  recipients text[] not null default '{}',
  subject text not null default 'Machine Intelligence — {{issue_title}}',
  body text not null default E'Dear colleagues,\n\nPlease find attached the {{issue_title}} issue of Machine Intelligence, published {{issue_date}}.\n\nRead the issue online: {{issue_url}}\n\nRegards,\nMachine Intelligence Editorial Team',
  faculty_approved_hash text,
  consent_confirmed_hash text,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.publication_email_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.publication_email_recipients (
  email text primary key check (email = lower(email)),
  unsubscribe_token text not null unique,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.publication_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  recipient text not null check (recipient = lower(recipient)),
  subject text not null,
  body text not null,
  idempotency_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'unknown', 'skipped')),
  provider_id text,
  last_error text,
  approved_by text not null,
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, recipient)
);

alter table public.publication_email_settings enable row level security;
alter table public.publication_email_recipients enable row level security;
alter table public.publication_email_deliveries enable row level security;

revoke all on public.publication_email_settings from public, anon, authenticated;
revoke all on public.publication_email_recipients from public, anon, authenticated;
revoke all on public.publication_email_deliveries from public, anon, authenticated;
grant all on public.publication_email_settings to service_role;
grant all on public.publication_email_recipients to service_role;
grant all on public.publication_email_deliveries to service_role;

create or replace function public.record_publication_email_consent(
  p_emails text[],
  p_tokens text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if cardinality(p_emails) is distinct from cardinality(p_tokens) then
    raise exception 'The recipient consent data is invalid.';
  end if;

  insert into public.publication_email_recipients as existing_recipient (
    email,
    unsubscribe_token,
    consented_at
  )
  select email, token, now()
    from unnest(p_emails, p_tokens) as consent(email, token)
  on conflict (email) do update
    set consented_at = coalesce(
          existing_recipient.consented_at,
          now()
        ),
        updated_at = now()
    where existing_recipient.unsubscribed_at is null;
end;
$$;

create or replace function public.unsubscribe_publication_email(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.publication_email_recipients
    set unsubscribed_at = coalesce(unsubscribed_at, now()),
        updated_at = now()
    where unsubscribe_token = p_token;
  return found;
end;
$$;

create or replace function public.claim_publication_email_delivery(p_delivery_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery public.publication_email_deliveries%rowtype;
begin
  select *
    into v_delivery
    from public.publication_email_deliveries
    where id = p_delivery_id
    for update;

  if not found then
    raise exception 'There is no prepared email for this recipient.';
  end if;
  if v_delivery.status = 'sent' then
    return to_jsonb(v_delivery);
  end if;
  if v_delivery.status = 'unknown' then
    raise exception 'Check the email provider dashboard before retrying this delivery.';
  end if;
  if v_delivery.status = 'sending'
     and v_delivery.attempted_at > now() - interval '15 minutes' then
    raise exception 'This recipient email is already being sent.';
  end if;
  if v_delivery.status = 'sending' then
    update public.publication_email_deliveries
      set status = 'unknown',
          last_error = 'The previous send attempt did not finish. Check the email provider log before retrying.',
          updated_at = now()
      where id = v_delivery.id
      returning * into v_delivery;
    return to_jsonb(v_delivery);
  end if;

  update public.publication_email_deliveries
    set status = 'sending',
        attempted_at = now(),
        last_error = null,
        updated_at = now()
    where id = v_delivery.id
    returning * into v_delivery;

  return to_jsonb(v_delivery);
end;
$$;

create or replace function public.finish_publication_email_delivery(
  p_delivery_id uuid,
  p_status text,
  p_provider_id text,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('sent', 'failed', 'unknown', 'skipped') then
    raise exception 'Invalid email delivery status.';
  end if;

  update public.publication_email_deliveries
    set status = p_status,
        provider_id = coalesce(p_provider_id, provider_id),
        last_error = left(p_error, 1000),
        sent_at = case when p_status = 'sent' then now() else sent_at end,
        updated_at = now()
    where id = p_delivery_id
      and status = 'sending';

  if not found then
    raise exception 'Could not update the recipient email status.';
  end if;
end;
$$;

revoke all on function public.record_publication_email_consent(text[], text[])
  from public, anon, authenticated;
revoke all on function public.unsubscribe_publication_email(text)
  from public, anon, authenticated;
revoke all on function public.claim_publication_email_delivery(uuid)
  from public, anon, authenticated;
revoke all on function public.finish_publication_email_delivery(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_publication_email_consent(text[], text[])
  to service_role;
grant execute on function public.unsubscribe_publication_email(text)
  to service_role;
grant execute on function public.claim_publication_email_delivery(uuid)
  to service_role;
grant execute on function public.finish_publication_email_delivery(uuid, text, text, text)
  to service_role;
