# ProjectMatic — Submission Guide

Panduan ringkas untuk menjalankan demo ProjectMatic.

## Ringkasan

ProjectMatic mengubah client brief menjadi draf proposal yang memuat Scope of Work, deliverables, milestones, dan estimasi biaya. Proposal dibuat oleh tool Langflow melalui MCP dengan konteks rate card AstraDB, lalu dapat direview serta disimpan sebagai PDF.

## Setup

1. Jalankan Langflow Desktop pada `http://localhost:7860`.
2. Pastikan pada **Project → MCP Server → Tools** terdapat tool proposal aktif, misalnya `generate_proposal_draft`.
3. Di root project, buat `.env` dari `.env.example`.

```powershell
Copy-Item .env.example .env
```

4. Isi `.env` menggunakan credential lokal:

```env
LANGFLOW_MCP_URL=http://localhost:7860/api/v1/mcp/project/PROJECT_ID/streamable
LANGFLOW_MCP_API_KEY=PROJECT_MCP_API_KEY
LANGFLOW_MCP_TOOL=generate_proposal_draft
PORT=5501
```

5. Jalankan aplikasi:

```powershell
node server/server.js
```

6. Buka `http://localhost:5501`, lalu periksa `http://localhost:5501/api/health`. Nilai `configured` harus `true` dan `mode` harus `mcp`.

## Skenario Demo

Paste brief berikut pada halaman Workspace:

```text
Kami membutuhkan campaign launching aplikasi financial planning untuk Gen Z.
Deliverables mencakup social media content, landing page, visual assets,
dan motion video. Target selesai dalam 6 minggu.
```

1. Isi nama klien dan pilih template `Integrated Campaign`.
2. Klik **Generate proposal**.
3. Tunjukkan status **Verified Langflow execution** pada hasil.
4. Klik **Review draft** untuk memperlihatkan scope, milestone, estimasi, asumsi, dan pertanyaan klarifikasi.
5. Klik **Cetak / Simpan PDF** untuk ekspor melalui dialog browser.
6. Tampilkan halaman Rate Card dan Templates sebagai standar bisnis aplikasi.

## Arsitektur

```text
Browser ProjectMatic → server/server.js → Langflow Project MCP tool
                                          └→ AstraDB data_ratecard
```

Gateway Node.js menyimpan API key di `.env`. Browser tidak menerima key apa pun.

## Responsible AI

- Semua proposal adalah draf dan membutuhkan persetujuan Project Manager.
- Aplikasi tidak mengirim proposal otomatis kepada klien.
- Jangan memasukkan API key, `.env`, atau brief rahasia ke repository/submission.

## Troubleshooting

| Gejala | Solusi |
| --- | --- |
| `EADDRINUSE` | Ubah `PORT` di `.env` atau tutup server lama. |
| `configured: false` | Isi `LANGFLOW_MCP_URL` dan `LANGFLOW_MCP_API_KEY`, lalu restart server. |
| Tool tidak ditemukan | Aktifkan flow pada **MCP Server → Edit Tools** di Langflow. |
| Output kosong | Pastikan flow memiliki komponen Chat Output. |
