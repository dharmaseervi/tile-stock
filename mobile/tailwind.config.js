/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Tokens from Tile Stock Home Ledger.dc.html
      colors: {
        bg: "#191713",
        field: "#211E19",      // search bar
        band: "#141210",       // brand group header + tab bar
        ink: {
          DEFAULT: "#F3EFE7",
          hi: "#F7F3EB",       // hero figure
          2: "#B5AC9E",        // box/design counts
          3: "#9E968A",        // mono labels
          4: "#8F877A",        // inactive tab
          out: "#B8AFA3",      // out-of-stock series name
          soft: "#D9D3C8",     // link text, ghost buttons
        },
        accent: "#2FB8AE",
        onAccent: "#161410",   // ink on accent fills
        amber: {
          DEFAULT: "#E8A33D",
          txt: "#EFC489",
        },
        red: "#E0533F",
      },
      fontFamily: {
        sans: ["IBMPlexSans_400Regular"],
        "sans-m": ["IBMPlexSans_500Medium"],
        "sans-sb": ["IBMPlexSans_600SemiBold"],
        mono: ["IBMPlexMono_400Regular"],
        "mono-m": ["IBMPlexMono_500Medium"],
      },
      borderColor: {
        rule: "rgba(255,255,255,0.09)",   // section rules, field border
        hairline: "rgba(255,255,255,0.05)", // between rows
        ghost: "rgba(255,255,255,0.16)",  // ghost button
        link: "rgba(255,255,255,0.18)",   // text-link underline
      },
    },
  },
  plugins: [],
};