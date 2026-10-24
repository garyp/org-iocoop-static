export default {
  plugins: ["prettier-plugin-astro"],
  overrides: [
    {
      files: ["*.md", "*.mdx"],
      options: {
        proseWrap: "always",
      },
    },
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
  printWidth: 100,
  semi: false,
}
