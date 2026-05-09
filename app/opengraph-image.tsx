import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Orbit - Tu plataforma de estudio'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8f8f8',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 360,
            height: 360,
            filter: 'drop-shadow(0 30px 60px rgba(255, 92, 0, 0.35))',
          }}
        >
          <svg
            width="360"
            height="360"
            viewBox="0 0 72 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.60183 13.1498C5.23721 5.88735 11.6396 0.515077 18.9021 1.15046L58.3514 4.60182C65.6138 5.2372 70.9861 11.6396 70.3507 18.9021L66.8993 58.3514C66.2639 65.6138 59.8615 70.9861 52.5991 70.3507L13.1498 66.8993C5.88736 66.2639 0.515086 59.8615 1.15047 52.5991L4.60183 13.1498Z"
              fill="url(#og_grad)"
            />
            <path
              d="M24.26 28.0203C27.5775 28.3106 30.5048 25.826 30.795 22.5085C31.0882 19.1577 34.0449 16.6482 37.3957 16.9414C40.7465 17.2345 43.2225 20.2191 42.9293 23.5699C42.6391 26.8877 45.0907 29.8428 48.4085 30.133C51.7262 30.4233 54.1778 33.3782 53.8876 36.696C53.5944 40.047 50.6375 42.5562 47.2864 42.2631C43.9354 41.9699 41.4618 38.9545 41.755 35.6034C42.0423 32.3192 39.6181 29.364 36.334 29.0767C33.0498 28.7893 30.1545 31.2188 29.8672 34.5029L29.8566 34.6245C29.5634 37.9753 26.6094 40.4541 23.2586 40.1609C19.9078 39.8677 17.4318 36.8829 17.7249 33.5321C18.0152 30.2146 20.9425 27.7301 24.26 28.0203ZM35.1661 42.4251C38.5169 42.7182 40.9956 45.6723 40.7025 49.0231C40.4093 52.3739 37.4553 54.8526 34.1045 54.5594C30.7537 54.2662 28.275 51.3122 28.5682 47.9614C28.8613 44.6106 31.8153 42.1319 35.1661 42.4251Z"
              fill="white"
            />
            <defs>
              <linearGradient
                id="og_grad"
                x1="5.75229"
                y1="0"
                x2="65.7489"
                y2="71.5011"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#FF8954" />
                <stop offset="1" stopColor="#FF4F00" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    ),
    { ...size },
  )
}
