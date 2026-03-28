# Moly Widget Template for my Graduation

A minimalist template to jumpstart building learning widgets using [`@moly-edu/widget-sdk`](https://www.npmjs.com/package/@moly-edu/widget-sdk).

## Quick Start

1. **Install Dependencies:**

```bash
   npm install
```

2. **Core Structure:**
   - Define your widget contract in `definition.ts`.
   - Define your widget component in `components/WidgetComponent.tsx`.
   - Config widget in `config/widget-config.json`
   - Also, you can free to change anything with `main.tsx`

3. **Development & Testing:**

   ```bash
   npm run dev
   ```

   - **To test your widget**, visit:
     https://moly-edu.vercel.app/dev/preview
   - Paste your localhost URL into the previewer to see it in action.

4. **Build & Validation:**

   ```bash
     npm run build
   ```

   - **Always run the build command before publishing** to ensure everything works correctly.
   - **Important:** Images are currently not supported in widgets. Adding images will cause an error during the build or runtime.

## Documentation

Visit [Moly Widget SDK](https://github.com/moly-edu/widget-sdk) for details
