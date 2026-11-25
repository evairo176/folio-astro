---
title: "CSS-in-JS Modern dengan Tailwind CSS dan shadcn/ui"
description: "Perbandingan pragmatis pendekatan CSS-in-JS di tahun 2026, fokus pada metodologi utility-first Tailwind CSS dan sistem desain berbasis komponen shadcn/ui."
date: "2026-06-10"
tags: ["CSS", "Tailwind", "shadcn/ui", "React", "Next.js", "UI", "Sistem Desain"]
lang: "id"
---

# CSS-in-JS Modern dengan Tailwind CSS dan shadcn/ui

Lanskap CSS-in-JS telah berkembang drastis sejak era awal Styled Components dan Emotion. Di tahun 2026, kita melihat pergeseran jelas menuju framework CSS utility-first yang dikombinasikan dengan library komponen yang mengadopsi TypeScript dan pengalaman developer. Mari kita eksaminasi keadaan terkini melalui dua pendekatan dominan: metodologi utility-first Tailwind CSS dan sistem desain berbasis komponen shadcn/ui.

## Revolusi Utility-First

Tailwind CSS merepresentasikan pergeseran fundamental dalam cara kita berpikir tentang CSS. Alih-alih menulis kelas CSS kustom untuk setiap komponen, Anda menyusun gaya dari kumpulan utility yang telah ditentukan. Pendekatan ini menawarkan beberapa keunggulan:

```jsx
// CSS-in-JS tradisional
const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.375rem;
  font-weight: 500;
  &:hover {
    background-color: #2563eb;
  }
`;

// Ekivalen Tailwind CSS
const Button = ({ children }) => (
  <button className="px-6 py-3 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600">
    {children}
  </button>
);
```

Pendekatan Tailwind menghilangkan konteks berpindah antara file CSS dan JSX, mengurangi overhead penamaan, dan menegakkan konsistensi desain melalui sistem desain yang terkendali. Namun, ada kurva pembelajaran—developer perlu menghafal kelas utility daripada properti CSS.

## shadcn/ui: Sistem Desain Berbasis Komponen

shadcn/ui mengambil pendekatan berbeda. Ini bukan library komponen tradisional yang diinstal via npm. Sebaliknya, Anda menyalin komponen langsung ke proyek Anda:

```bash
npx shadcn@latest add button
```

Perintah ini menyalin komponen Button yang sepenuhnya bertipe dan dapat dikustomisasi ke direktori `components/ui` Anda:

```tsx
// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

Inovasi kunci di sini adalah menggunakan `class-variance-authority` (CVA) untuk membuat API varian yang type-safe sambil memanfaatkan Tailwind CSS di balik layar. Anda mendapatkan yang terbaik dari kedua dunia: komposisi kelas utility dengan abstraksi level komponen.

## Pertimbangan Performa

Solusi CSS-in-JS runtime (Styled Components, Emotion) memiliki overhead performa dalam skala besar. Mereka menyuntikkan gaya secara dinamis, yang memengaruhi First Contentful Paint (FCP) dan Cumulative Layout Shift (CLS).

Tailwind CSS dengan kompilasi JIT menghasilkan CSS yang dioptimalkan pada waktu build:

```css
/* CSS yang dihasilkan - hanya menyertakan kelas yang benar-benar Anda gunakan */
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.bg-blue-500 { background-color: #3b82f6; }
/* ... */
```

Untuk aplikasi produksi tipikal, ini menghasilkan bundle CSS di bawah 10KB terkompresi, dibandingkan dengan 50-100KB untuk framework CSS tradisional.

Komponen shadcn/ui bahkan lebih performan—karena mereka bagian dari codebase Anda, tree-shaking bekerja sempurna. Anda hanya mengirimkan komponen yang benar-benar digunakan.

## Integrasi TypeScript

Kedua pendekatan unggul dengan TypeScript. Tailwind CSS menawarkan IntelliSense melalui ekstensi VS Code resmi, sementara shadcn/ui menyediakan pengetikan prop komponen lengkap:

```tsx
import { Button } from "@/components/ui/button"

// TypeScript mengetahui semua varian yang valid
<Button variant="destructive" size="lg">Hapus</Button>
<Button variant="outline" size="icon">
  <SettingsIcon />
</Button>
```

Direktori `@/components/ui` menjadi sumber kebenaran tunggal untuk komponen UI Anda, dengan autocomplete untuk semua varian dan props.

## Kustomisasi dan Tema

File konfigurasi Tailwind (`tailwind.config.js`) memungkinkan kustomisasi mendalam:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#1d4ed8',
        },
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
}
```

shadcn/ui membangun ini dengan variabel CSS untuk theming:

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}
```

Pendekatan berbasis variabel ini memungkinkan dark mode dan pergantian tema yang mulus tanpa overhead runtime CSS-in-JS.

## Kapan Memilih Setiap Pendekatan

**Pilih Tailwind CSS langsung ketika:**
- Membangun sistem desain dari nol
- Membutuhkan fleksibilitas dan kontrol maksimum
- Bekerja pada situs marketing atau halaman konten berat
- Tim sudah mahir dengan kelas utility

**Pilih shadcn/ui ketika:**
- Membangun alat internal atau dashboard
- Membutuhkan komponen yang konsisten dan aksesibel dengan cepat
- Menginginkan API komponen yang type-safe
- Lebih memilih menyalin komponen daripada dependensi npm

## Strategi Migrasi

Jika Anda bermigrasi dari CSS-in-JS tradisional, berikut pendekatan pragmatis:

1. **Mulai dengan Tailwind CSS** untuk layout dan kelas utility
2. **Gunakan shadcn/ui untuk komponen kompleks** (dialog, dropdown, date picker)
3. **Ganti Styled Components secara bertahap** dengan kelas Tailwind
4. **Ekstrak pola berulang** ke library komponen Anda sendiri menggunakan CVA

```tsx
// Contoh migrasi
// Sebelum: Styled Components
const OldCard = styled.div`
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

// Sesudah: Pola Tailwind + shadcn/ui
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg bg-white shadow-sm",
  {
    variants: {
      padding: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      padding: "md",
    },
  }
)

interface CardProps extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof cardVariants> {}

const Card = ({ className, padding, ...props }: CardProps) => (
  <div className={cn(cardVariants({ padding }), className)} {...props} />
)
```

## Kesimpulan

Ekosistem CSS-in-JS modern telah matang melampaui solusi runtime. Tailwind CSS menyediakan fondasi utility-first yang menghilangkan bloat CSS, sementara shadcn/ui menawarkan lapisan berbasis komponen di atasnya dengan dukungan TypeScript yang sangat baik. Bersama-sama, mereka membentuk stack yang kuat untuk membangun UI yang dapat dipelihara dan performan di tahun 2026.

Wawasan kunci: CSS-in-JS tidak lagi tentang injeksi gaya runtime. Ini tentang memanfaatkan optimasi waktu build, type safety, dan arsitektur komponen untuk membuat sistem desain yang scalable. Apakah Anda memilih Tailwind mentah atau komponen kurasi shadcn/ui tergantung pada kebutuhan spesifik proyek Anda, tetapi keduanya merepresentasikan masa depan CSS dalam aplikasi JavaScript.