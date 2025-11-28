/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/presentation/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Typography classes - ensure they're not purged
    'text-display-xl', 'text-display-l', 'text-display-m',
    'text-title-xl', 'text-title-l', 'text-title-m', 'text-title-s', 'text-title-xs',
    'text-body-m', 'text-body-s', 'text-body-xs',
    'text-label-l', 'text-label-m', 'text-label-s',
    'text-caption',
    'text-button-l', 'text-button-m', 'text-button-s',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* ========================================
         FONT FAMILIES
         MAC USA ONE Typography System
         ======================================== */
      fontFamily: {
        display: ["var(--font-archivo)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },

      /* ========================================
         FONT SIZES
         MAC USA ONE Typography Scale
         ======================================== */
      fontSize: {
        /* Display sizes */
        "display-xl": ["4.5rem", { lineHeight: "1", fontWeight: "600", letterSpacing: "-0.02em" }],
        "display-l": ["3.5rem", { lineHeight: "1", fontWeight: "600", letterSpacing: "-0.02em" }],
        "display-m": ["2.75rem", { lineHeight: "1.1", fontWeight: "500", letterSpacing: "-0.01em" }],

        /* Title sizes */
        "title-xl": ["2.25rem", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.01em" }],
        "title-l": ["1.75rem", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.01em" }],
        "title-m": ["1.5rem", { lineHeight: "1.3", fontWeight: "500" }],
        "title-s": ["1.25rem", { lineHeight: "1.4", fontWeight: "500" }],
        "title-xs": ["1.125rem", { lineHeight: "1.4", fontWeight: "500" }],

        /* Body sizes */
        "body-m": ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-s": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-xs": ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],

        /* Label sizes */
        "label-l": ["1rem", { lineHeight: "1", fontWeight: "500" }],
        "label-m": ["0.875rem", { lineHeight: "1", fontWeight: "500" }],
        "label-s": ["0.75rem", { lineHeight: "1", fontWeight: "500" }],

        /* Caption */
        "caption": ["0.75rem", { lineHeight: "1.3", fontWeight: "400" }],

        /* Button sizes */
        "button-l": ["1rem", { lineHeight: "1", fontWeight: "600" }],
        "button-m": ["0.875rem", { lineHeight: "1", fontWeight: "600" }],
        "button-s": ["0.75rem", { lineHeight: "1", fontWeight: "600" }],
      },

      /* ========================================
         COLORS
         MAC USA ONE Color System
         ======================================== */
      colors: {
        /* Core semantic colors */
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",

        /* Brand colors */
        brand: {
          DEFAULT: "#F66600",
          secondary: "#0B80D8",
          typography: "#262627",
          background: "#FEFEFE",
        },

        /* Primary (Orange) */
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          200: "var(--primary-200)",
          300: "var(--primary-300)",
          400: "var(--primary-400)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          800: "var(--primary-800)",
          900: "var(--primary-900)",
          950: "var(--primary-950)",
        },

        /* Secondary (Blue) */
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          50: "var(--secondary-50)",
          100: "var(--secondary-100)",
          200: "var(--secondary-200)",
          300: "var(--secondary-300)",
          400: "var(--secondary-400)",
          500: "var(--secondary-500)",
          600: "var(--secondary-600)",
          700: "var(--secondary-700)",
          800: "var(--secondary-800)",
          900: "var(--secondary-900)",
          950: "var(--secondary-950)",
        },

        /* Destructive */
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },

        /* Muted */
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },

        /* Accent */
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },

        /* Popover */
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },

        /* Card */
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },

        /* Semantic state colors */
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
          50: "var(--green-50)",
          100: "var(--green-100)",
          200: "var(--green-200)",
          300: "var(--green-300)",
          400: "var(--green-400)",
          500: "var(--green-500)",
          600: "var(--green-600)",
          700: "var(--green-700)",
          800: "var(--green-800)",
          900: "var(--green-900)",
        },

        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
          50: "var(--amber-50)",
          100: "var(--amber-100)",
          200: "var(--amber-200)",
          300: "var(--amber-300)",
          400: "var(--amber-400)",
          500: "var(--amber-500)",
          600: "var(--amber-600)",
          700: "var(--amber-700)",
          800: "var(--amber-800)",
          900: "var(--amber-900)",
        },

        error: {
          DEFAULT: "var(--error)",
          foreground: "var(--error-foreground)",
          50: "var(--red-50)",
          100: "var(--red-100)",
          200: "var(--red-200)",
          300: "var(--red-300)",
          400: "var(--red-400)",
          500: "var(--red-500)",
          600: "var(--red-600)",
          700: "var(--red-700)",
          800: "var(--red-800)",
          900: "var(--red-900)",
        },

        info: {
          DEFAULT: "var(--info)",
          foreground: "var(--info-foreground)",
          50: "var(--sky-50)",
          100: "var(--sky-100)",
          200: "var(--sky-200)",
          300: "var(--sky-300)",
          400: "var(--sky-400)",
          500: "var(--sky-500)",
          600: "var(--sky-600)",
          700: "var(--sky-700)",
          800: "var(--sky-800)",
          900: "var(--sky-900)",
        },

        /* Indicator colors */
        indicator: {
          online: "var(--clr-indicator-online)",
          away: "var(--clr-indicator-away)",
          offline: "var(--clr-indicator-offline)",
        },

        /* Sidebar */
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },

        /* Chart colors */
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },

        /* Color scales */
        orange: {
          50: "var(--orange-50)",
          100: "var(--orange-100)",
          200: "var(--orange-200)",
          300: "var(--orange-300)",
          400: "var(--orange-400)",
          500: "var(--orange-500)",
          600: "var(--orange-600)",
          700: "var(--orange-700)",
          800: "var(--orange-800)",
          900: "var(--orange-900)",
        },

        blue: {
          50: "var(--blue-50)",
          100: "var(--blue-100)",
          200: "var(--blue-200)",
          300: "var(--blue-300)",
          400: "var(--blue-400)",
          500: "var(--blue-500)",
          600: "var(--blue-600)",
          700: "var(--blue-700)",
          800: "var(--blue-800)",
          900: "var(--blue-900)",
        },

        green: {
          50: "var(--green-50)",
          100: "var(--green-100)",
          200: "var(--green-200)",
          300: "var(--green-300)",
          400: "var(--green-400)",
          500: "var(--green-500)",
          600: "var(--green-600)",
          700: "var(--green-700)",
          800: "var(--green-800)",
          900: "var(--green-900)",
        },

        red: {
          50: "var(--red-50)",
          100: "var(--red-100)",
          200: "var(--red-200)",
          300: "var(--red-300)",
          400: "var(--red-400)",
          500: "var(--red-500)",
          600: "var(--red-600)",
          700: "var(--red-700)",
          800: "var(--red-800)",
          900: "var(--red-900)",
        },

        yellow: {
          50: "var(--yellow-50)",
          100: "var(--yellow-100)",
          200: "var(--yellow-200)",
          300: "var(--yellow-300)",
          400: "var(--yellow-400)",
          500: "var(--yellow-500)",
          600: "var(--yellow-600)",
          700: "var(--yellow-700)",
          800: "var(--yellow-800)",
          900: "var(--yellow-900)",
        },

        amber: {
          50: "var(--amber-50)",
          100: "var(--amber-100)",
          200: "var(--amber-200)",
          300: "var(--amber-300)",
          400: "var(--amber-400)",
          500: "var(--amber-500)",
          600: "var(--amber-600)",
          700: "var(--amber-700)",
          800: "var(--amber-800)",
          900: "var(--amber-900)",
        },

        sky: {
          50: "var(--sky-50)",
          100: "var(--sky-100)",
          200: "var(--sky-200)",
          300: "var(--sky-300)",
          400: "var(--sky-400)",
          500: "var(--sky-500)",
          600: "var(--sky-600)",
          700: "var(--sky-700)",
          800: "var(--sky-800)",
          900: "var(--sky-900)",
        },

        slate: {
          50: "var(--slate-50)",
          100: "var(--slate-100)",
          200: "var(--slate-200)",
          300: "var(--slate-300)",
          400: "var(--slate-400)",
          500: "var(--slate-500)",
          600: "var(--slate-600)",
          700: "var(--slate-700)",
          800: "var(--slate-800)",
          900: "var(--slate-900)",
        },

        gray: {
          50: "var(--gray-50)",
          100: "var(--gray-100)",
          200: "var(--gray-200)",
          300: "var(--gray-300)",
          400: "var(--gray-400)",
          500: "var(--gray-500)",
          600: "var(--gray-600)",
          700: "var(--gray-700)",
          800: "var(--gray-800)",
          900: "var(--gray-900)",
        },

        neutral: {
          50: "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          400: "var(--neutral-400)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          800: "var(--neutral-800)",
          900: "var(--neutral-900)",
        },
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #FF885C, #F88800, #CC4700, #471A02)",
        "brand-gradient-horizontal": "linear-gradient(90deg, #FF885C, #F88800, #CC4700, #471A02)",
        "brand-gradient-vertical": "linear-gradient(180deg, #FF885C, #F88800, #CC4700, #471A02)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
