# services/imgbb/

Uploads user-captured images to ImgBB and returns a public URL. SerpApi Google Lens requires a URL, not a file upload — this module is the bridge.

## Surface

- `async upload(image_bytes: bytes) -> str` — returns the public display URL

That is the whole module. Thin on purpose.
