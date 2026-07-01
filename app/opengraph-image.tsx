import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CC Verse — Verified carbon credits';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          backgroundColor: '#13140e',
          padding: 80,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 400,
            color: '#f4f3e8',
            letterSpacing: '-2px',
            lineHeight: 0.9,
          }}
        >
          CC Verse
        </div>
        <div style={{ fontSize: 28, color: '#ebfc72', marginTop: 24 }}>
          Verified carbon credits, end to end.
        </div>
      </div>
    ),
    { ...size },
  );
}
