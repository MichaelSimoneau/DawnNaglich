const path = require("path");
const fs = require("fs");

/**
 * Webpack config for Expo Router web exports
 * This fixes the issue where absolute file paths are used in HTML script tags
 *
 * Note: Expo Router may use Metro for bundling, but this config will be used
 * if webpack is involved in HTML generation or asset processing
 */
module.exports = function (env, argv) {
  return {
    // Set public path to relative
    output: {
      publicPath: "/",
    },
    plugins: [
      // Custom plugin to fix HTML script paths
      {
        apply: (compiler) => {
          compiler.hooks.emit.tap("FixHtmlPaths", (compilation) => {
            // Find HTML assets
            Object.keys(compilation.assets).forEach((filename) => {
              if (filename.endsWith(".html")) {
                let source = compilation.assets[filename].source();

                // Replace absolute paths with relative paths
                // Pattern: /Users/.../node_modules/.../expo-router/entry.js
                const absolutePathRegex =
                  /src=["'](\/Users\/[^"']+node_modules[^"']+expo-router[^"']+entry\.js)["']/g;

                source = source.replace(
                  absolutePathRegex,
                  (match, absolutePath) => {
                    // Calculate relative path from HTML location to entry.js
                    // The entry.js is copied to dist with the absolute path structure
                    // We need to convert it to a web-accessible path

                    // Extract the path after the project root
                    const projectRoot = process.cwd();
                    const relativeFromRoot = absolutePath.replace(
                      projectRoot,
                      "",
                    );

                    // Convert to web path (remove leading slash if present, add /)
                    const webPath = relativeFromRoot.startsWith("/")
                      ? relativeFromRoot
                      : "/" + relativeFromRoot;

                    return `src="${webPath}"`;
                  },
                );

                // Update the asset
                compilation.assets[filename] = {
                  source: () => source,
                  size: () => source.length,
                };
              }
            });
          });
        },
      },
    ],
  };
};

/**
 * Post-build function to fix HTML paths after expo export
 * This can be called from the build script
 */
function fixHtmlPathsAfterExport(outputDir = "dist") {
  const htmlPath = path.join(process.cwd(), outputDir, "index.html");

  if (!fs.existsSync(htmlPath)) {
    console.warn(`HTML file not found at ${htmlPath}`);
    return;
  }

  let html = fs.readFileSync(htmlPath, "utf8");
  const originalHtml = html;

  // Pattern to match absolute paths in script tags
  const absolutePathRegex =
    /src=["'](\/Users\/[^"']+node_modules[^"']+expo-router[^"']+entry\.js)["']/g;

  // Find where entry.js actually is in dist
  const distRoot = path.join(process.cwd(), outputDir);
  const possiblePaths = [
    path.join(
      distRoot,
      "Users",
      "devcoup",
      "Projects",
      "dawn-naglich",
      "node_modules",
      ".pnpm",
      "expo-router@3.5.24_d6c994eb312fe68e57c872410ae196eb",
      "node_modules",
      "expo-router",
      "entry.js",
    ),
    path.join(distRoot, "_expo", "static", "js", "entry.js"),
  ];

  let entryPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      entryPath = possiblePath;
      break;
    }
  }

  if (entryPath) {
    // Calculate relative path from index.html to entry.js
    const relativePath = path.relative(path.dirname(htmlPath), entryPath);
    const webPath =
      "/" + relativePath.replace(/\\/g, "/").replace(/^\.\.\//, "");

    html = html.replace(absolutePathRegex, `src="${webPath}"`);
  } else {
    // Fallback: use standard Expo path
    html = html.replace(absolutePathRegex, 'src="/_expo/static/js/entry.js"');
  }

  if (html !== originalHtml) {
    fs.writeFileSync(htmlPath, html, "utf8");
    console.log("✓ Fixed absolute paths in index.html");
  } else {
    console.log("✓ No absolute paths found in index.html");
  }
}

// Export for use in build scripts
if (require.main === module) {
  const outputDir = process.argv[2] || "dist";
  fixHtmlPathsAfterExport(outputDir);
}

module.exports.fixHtmlPathsAfterExport = fixHtmlPathsAfterExport;
