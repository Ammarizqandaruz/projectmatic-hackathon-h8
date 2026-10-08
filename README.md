# ProjectMatic

> **AI-Driven Automated Client Proposal & Project Scope Generator untuk agensi kreatif.**

ProjectMatic mengubah client brief mentah menjadi draf proposal, Scope of Work, milestone, deliverables, dan estimasi biaya yang dapat direview oleh Project Manager. Produk ini dibuat untuk mengurangi waktu penyusunan proposal manual dan menjaga penggunaan rate card tetap konsisten.

## Problem

Agensi kreatif dan freelancer sering menghabiskan 3–5 jam untuk membaca brief yang tidak terstruktur, menyusun Scope of Work, menghitung estimasi, dan membuat proposal. Proses manual tersebut lambat, rawan salah hitung, dan dapat menurunkan win-rate ketika proposal terlambat dikirim.

## Solution

Pengguna menempelkan brief pada dashboard ProjectMatic. Website memanggil tool proposal di Langflow melalui MCP. Tool Langflow menggunakan konteks rate card AstraDB dan menghasilkan draf proposal berbahasa Indonesia. Hasilnya disimpan secara lokal di browser untuk direview serta diekspor dengan fitur **Print / Save as PDF** browser.

## Key Features

- Generate proposal berbasis **Langflow MCP tool**, bukan kalkulasi dummy di browser.
- RAG rate card melalui **AstraDB** untuk scope dan estimasi lebih konsisten.
- Proposal library, rate card dashboard, dan pilihan template.
- Bukti provenance pada hasil: nama MCP tool, session ID, dan waktu eksekusi.
- Review-first: proposal tidak dikirim otomatis ke klien.
- Ekspor proposal ke PDF menggunakan print dialog browser.
- Desain modern, responsif, dan mobile-first dengan Vanilla JavaScript + Tailwind CDN.

## Architecture

```text
User
  │ brief
  ▼
ProjectMatic Web UI (IBM Bob workspace)
  │ POST /api/generate-proposal
  ▼
Node.js local gateway (server/server.js)
  │ MCP Streamable HTTP, x-api-key server-side
  ▼
Langflow Project MCP Server
  │ proposal tool
  ├── AstraDB: data_ratecard
  └── LLM: generates proposal draft
  ▼
ProjectMatic Review + Print / Save as PDF
```

IBM Bob berperan sebagai workspace/interface pengembangan dan dapat terhubung ke MCP server Langflow. Untuk website demo, `server/server.js` menjadi gateway lokal agar API key tidak pernah terkirim ke browser.

## Tech Stack

| Tool | Peran |
| --- | --- |
| IBM Bob | Workspace dan MCP client untuk pengembangan/demo |
| Langflow | Proposal-generation logic dan MCP server |
| AstraDB | Vector collection `data_ratecard` untuk rate card dan konteks retrieval |
| Composio | Integrasi eksternal yang dapat ditambahkan, misalnya Google Docs/CRM |
| Node.js | Local gateway aman antara browser dan Langflow MCP |
| Vanilla JS + Tailwind CSS | Antarmuka web responsif |

## Quick Start

### Requirements

- Node.js 18+ (direkomendasikan Node.js 20+)
- Langflow Desktop berjalan pada `http://localhost:7860`
- Project MCP endpoint Langflow yang memiliki tool proposal aktif
- AstraDB dan rate card sudah dikonfigurasi di flow Langflow

### 1. Clone atau buka folder proyek

```powershell
cd D:\IBM_Bob\hackathon-h8
```

### 2. Buat file konfigurasi lokal

```powershell
Copy-Item .env.example .env
notepad .env
```

Isi `.env` dengan nilai milik Anda. Jangan commit file ini.

```env
LANGFLOW_MCP_URL=http://localhost:7860/api/v1/mcp/project/PROJECT_ID/streamable
LANGFLOW_MCP_API_KEY=PROJECT_MCP_API_KEY
LANGFLOW_MCP_TOOL=generate_proposal_draft
PORT=5501
```

`LANGFLOW_MCP_TOOL` dapat dikosongkan apabila project hanya mengekspos satu tool. Jika ada lebih dari satu tool, lihat nama tepatnya di **Langflow → Project → MCP Server → Tools**.

### 3. Jalankan aplikasi

```powershell
node server/server.js
```

Lalu buka:

```text
http://localhost:5501
```

### 4. Verifikasi integrasi

Buka `http://localhost:5501/api/health`. Respons yang benar berisi:

```json
{
  "configured": true,
  "provider": "Langflow MCP",
  "mode": "mcp"
}
```

## Cara Demo

1. Buka halaman **Workspace**.
2. Masukkan brief, misalnya:

   ```text
   Kami membutuhkan campaign launching aplikasi financial planning untuk Gen Z.
   Deliverables mencakup social media content, landing page, visual assets,
   dan motion video. Target selesai dalam 6 minggu.
   ```

3. Isi nama klien dan pilih template proposal.
4. Klik **Generate proposal**.
5. Pastikan modal menampilkan **Verified Langflow execution**.
6. Klik **Review draft** untuk meninjau output asli Langflow.
7. Klik **Cetak / Simpan PDF** dan pilih **Save as PDF** dari dialog browser.

Panduan lengkap untuk penilaian dan troubleshooting tersedia di [docs/SUBMISSION_GUIDE.md](docs/SUBMISSION_GUIDE.md).

## Responsible AI & Security

- Semua hasil adalah **draf** dan memerlukan review Project Manager.
- Scope, timeline, kuantitas, dan estimasi tidak otomatis dikirim ke klien.
- API key hanya dibaca oleh `server.js` dari `.env`; key tidak dimasukkan ke HTML atau JavaScript browser.
- Jangan unggah `.env`, API key, client brief rahasia, atau data produksi ke repository publik.
- Jika key pernah terlihat pada chat, screenshot, atau commit, revoke lalu buat key baru.

## Project Structure

```text
hackathon-h8/
├── index.html               # Workspace dan form brief (entry point)
├── assets/
│   ├── css/style.css         # Styling tambahan
│   └── js/                   # JavaScript dan data rate card UI
├── pages/                    # Halaman proposal, rate card, template, review
├── server/server.js          # Local gateway ke Langflow MCP / Flow API
├── docs/SUBMISSION_GUIDE.md  # Panduan untuk menjalankan projek
├── .env.example             # Template konfigurasi tanpa secret
└── SUBMISSION_GUIDE.md      # Panduan untuk menjalankan projek
```

## License

Prototype hackathon untuk demonstrasi ProjectMatic.
