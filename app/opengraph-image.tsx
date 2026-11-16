import { ImageResponse } from "next/og";
import { magazine } from "@/config/magazine";
import { siteCopy } from "@/content/site";

export const alt = siteCopy.seo.ogAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f9f7f1",
          color: "#18352e",
          padding: "72px",
          border: "18px solid #e9efe6",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#347763",
            fontSize: 22,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {magazine.departmentShort} · {magazine.universityShort}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 1.04 }}>
            {magazine.name}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#587067" }}>
            {siteCopy.home.intro}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            width: "100%",
            borderTop: "1px solid #dbe1d6",
            paddingTop: 20,
            fontSize: 21,
            color: "#587067",
          }}
        >
          {siteCopy.seo.ogFooter}
        </div>
      </div>
    ),
    size,
  );
}
