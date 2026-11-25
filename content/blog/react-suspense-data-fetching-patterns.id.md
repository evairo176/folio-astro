---
title: "React Suspense untuk Data Fetching: Pola Produksi"
description: "Pola praktis menggunakan React Suspense dengan data fetching di aplikasi produksi. Mencakup error boundaries, streaming SSR, dan fitur concurrent."
date: 2026-06-10
tags: ["React", "Suspense", "Data Fetching", "Next.js", "Performance"]
lang: "id"
---

# React Suspense untuk Data Fetching: Pola Produksi

React Suspense telah berevolusi dari primitif loading state menjadi sistem koordinasi data fetching yang matang. Kebanyakan tutorial hanya membahas dasar-dasar, tapi aplikasi produksi membutuhkan pola yang lebih canggih. Ini yang perlu kamu ketahui.

## Masalah Inti

Data fetching tradisional di komponen React menciptakan waterfall:

```jsx
// ❌ Waterfall berurutan
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  useEffect(() => {
    if (user) {
      fetchUserPosts(userId).then(setPosts);
    }
  }, [user, userId]);

  if (!user || !posts) return <Spinner />;
  
  return (
    <div>
      <h1>{user.name}</h1>
      <PostList posts={posts} />
    </div>
  );
}
```

Setiap effect menunggu yang sebelumnya, membuat loading berurutan. Suspense menyelesaikan ini dengan mendeklarasikan dependensi data di awal.

## Suspense dengan React 19

React 19 memperkenalkan dukungan Suspense kelas satu dengan hook `use`:

```jsx
import { use, Suspense } from 'react';

// Bungkus promise kamu
function fetchUserData(userId) {
  return fetch(`/api/users/${userId}`).then(r => r.json());
}

function UserPosts({ userId }) {
  // use() membaca nilai promise, suspend jika belum siap
  const posts = use(fetchUserPosts(userId));
  
  return <PostList posts={posts} />;
}

function UserProfile({ userId }) {
  const user = use(fetchUserData(userId));
  
  return (
    <div>
      <h1>{user.name}</h1>
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts userId={userId} />
      </Suspense>
    </div>
  );
}
```

Insight kunci: `use()` mensuspensi komponen sampai promise resolve. Batas `Suspense` parent menangkap suspensi ini dan menampilkan fallback.

## Error Boundaries Wajib Ada

Suspense melempar promise, tapi error tetap perlu ditangani:

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

// Penggunaan
<ErrorBoundary fallback={(error) => <ErrorDisplay error={error} />}>
  <Suspense fallback={<Loading />}>
    <UserProfile userId={userId} />
  </Suspense>
</ErrorBoundary>
```

Tempatkan error boundaries di atas batas Suspense. Masing-masing bisa punya strategi recovery berbeda.

## Streaming SSR dengan Next.js 15

App Router Next.js 15 sepenuhnya mengadopsi Suspense untuk streaming:

```jsx
// app/user/[id]/page.jsx
import { Suspense } from 'react';

async function getUser(id) {
  const res = await fetch(`https://api.example.com/user/${id}`);
  return res.json();
}

async function getUserPosts(id) {
  const res = await fetch(`https://api.example.com/user/${id}/posts`);
  return res.json();
}

// Komponen ini akan suspend
async function UserHeader({ id }) {
  const user = await getUser(id);
  return <h1>{user.name}</h1>;
}

async function UserPosts({ id }) {
  const posts = await getUserPosts(id);
  return <PostList posts={posts} />;
}

export default function UserPage({ params }) {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <UserHeader id={params.id} />
      </Suspense>
      
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts id={params.id} />
      </Suspense>
    </div>
  );
}
```

Halaman streaming dalam chunk: header muncul dulu, lalu posts. Ini meningkatkan perceived performance secara dramatis.

## Pola Integrasi Cache

Untuk aplikasi nyata, kamu butuh caching. Ini pola sederhana tapi efektif:

```jsx
// lib/cache.js
const cache = new Map();

export function fetchWithCache(key, fetcher) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const promise = fetcher();
  cache.set(key, promise);
  
  // Auto-hapus setelah 5 menit
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);
  
  return promise;
}

// Komponen
function UserProfile({ userId }) {
  const user = use(fetchWithCache(
    `user:${userId}`,
    () => fetchUser(userId)
  ));
  
  // ...
}
```

Untuk produksi, gunakan library seperti `swr`, `react-query`, atau `@tanstack/react-query` yang sudah punya dukungan Suspense built-in.

## Fitur Concurrent: useTransition

`useTransition` membuat UI tetap responsif selama update data:

```jsx
import { useTransition, Suspense } from 'react';

function SearchResults({ query }) {
  const results = use(searchAPI(query));
  return <ResultsList results={results} />;
}

function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  
  const handleSearch = (newQuery) => {
    startTransition(() => {
      setQuery(newQuery);
    });
  };
  
  return (
    <div>
      <SearchBar 
        onSearch={handleSearch}
        isPending={isPending}
      />
      
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchResults query={query} />
      </Suspense>
    </div>
  );
}
```

Flag `isPending` menunjukkan ketika transisi terjadi, memungkinkan kamu menampilkan optimistic updates atau loading indicators.

## Jebakan yang Perlu Diwaspadai

1. **Batas Suspense bersarang**: Terlalu banyak menyebabkan layout shift. Kelompokkan konten terkait.
2. **Memory leaks**: Batalkan promise saat unmount dengan AbortController.
3. **Ketidakcocokan server/client**: Pastikan data fetching bekerja di kedua environment.
4. **Penempatan error boundary**: Penempatan salah bisa menyembunyikan error atau merusak Suspense.

## Checklist Produksi

- [ ] Bungkus komponen Suspense dengan ErrorBoundary
- [ ] Implementasikan cache invalidation yang tepat
- [ ] Test perilaku streaming SSR
- [ ] Tambahkan komponen skeleton loading
- [ ] Monitor waktu fallback Suspense
- [ ] Implementasikan retry logic untuk promise yang gagal
- [ ] Gunakan `useTransition` untuk update state
- [ ] Pertimbangkan hook `use` React 19 untuk kode lebih sederhana

Suspense mengubah cara kita berpikir tentang data loading di React. Ini bukan hanya tentang menampilkan spinner—ini tentang mengkoordinasikan kerja asynchronous di seluruh pohon komponen. Mulai dengan pola sederhana, lalu tambahkan caching dan error handling sesuai kebutuhan.

Hasilnya: perceived performance lebih cepat, user experience lebih baik, dan kode komponen lebih bersih.