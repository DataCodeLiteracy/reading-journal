/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.aladin.co.kr",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "search1.kakaocdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "search2.kakaocdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "search3.kakaocdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cover.nl.go.kr",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "cover.nl.go.kr",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
}

module.exports = nextConfig
