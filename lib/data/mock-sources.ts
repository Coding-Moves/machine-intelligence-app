import type { Source } from "@/lib/types";

const sourceRows: Array<[string, string, Source["region"], Source["kind"]]> = [
  ["Dawn (Business / Sci-Tech)", "https://www.dawn.com", "pakistan", "news"],
  ["Express Tribune (Technology)", "https://tribune.com.pk/technology", "pakistan", "news"],
  ["Associated Press of Pakistan", "https://www.app.com.pk", "pakistan", "government"],
  ["Business Recorder", "https://www.brecorder.com", "pakistan", "news"],
  ["Ministry of IT and Telecom", "https://moitt.gov.pk", "pakistan", "government"],
  ["Higher Education Commission", "https://www.hec.gov.pk", "pakistan", "government"],
  ["ProPakistani", "https://propakistani.pk/technology/", "pakistan", "news"],
  ["TechJuice", "https://www.techjuice.pk", "pakistan", "news"],
  [
    "Google News · Pakistan AI search",
    "https://news.google.com/rss/search?q=Pakistan+artificial+intelligence&hl=en-PK&gl=PK&ceid=PK:en",
    "pakistan",
    "news",
  ],
  ["Reuters Technology", "https://www.reuters.com/technology/", "global", "news"],
  ["AP Technology", "https://apnews.com/hub/technology", "global", "news"],
  ["TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/", "global", "news"],
  ["The Verge AI", "https://www.theverge.com/ai-artificial-intelligence", "global", "news"],
  ["IEEE Spectrum", "https://spectrum.ieee.org/artificial-intelligence", "global", "news"],
  ["MIT Technology Review", "https://www.technologyreview.com/topic/artificial-intelligence/", "global", "news"],
  ["OpenAI", "https://openai.com/news/", "global", "official_blog"],
  ["Anthropic", "https://www.anthropic.com/news", "global", "official_blog"],
  ["Google DeepMind", "https://deepmind.google/discover/blog/", "global", "official_blog"],
  ["Google AI blog", "https://blog.google/technology/google-labs/", "global", "official_blog"],
  ["NVIDIA blog", "https://blogs.nvidia.com/blog/category/deep-learning/", "global", "official_blog"],
  ["Meta AI", "https://ai.meta.com/blog/", "global", "official_blog"],
  ["Microsoft AI", "https://blogs.microsoft.com/ai/", "global", "official_blog"],
  ["arXiv cs.AI", "https://arxiv.org/list/cs.AI/recent", "global", "research"],
  ["arXiv cs.CL", "https://arxiv.org/list/cs.CL/recent", "global", "research"],
  [
    "ScienceDaily AI",
    "https://www.sciencedaily.com/news/computers_math/artificial_intelligence/",
    "global",
    "research",
  ],
  ["MIT News · Artificial intelligence", "https://news.mit.edu/topic/artificial-intelligence2", "global", "research"],
  ["Tufts Now · AI", "https://now.tufts.edu/topics/artificial-intelligence", "global", "research"],
];

export const mockSources: Source[] = sourceRows.map(
  ([name, homepage, region, kind], index) => ({
    id: "seed-source-" + index,
    name,
    feedUrl: null,
    homepage,
    region,
    kind,
    trustWeight: 1,
    active: true,
  }),
);
