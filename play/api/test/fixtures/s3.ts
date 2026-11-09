// A fake S3 bucket for play's tests (src/blobs.ts bucketStore): the object routes Bun's S3 client uses (HEAD, GET, PUT,
// path-style, one bucket) answered from memory on a local port, every object kept with its media type.
export function fakeS3(bucket = "maiacity") {
  const objects = new Map<string, { bytes: Uint8Array; type: string }>();
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      const prefix = `/${bucket}/`;
      if (!path.startsWith(prefix)) return new Response("NoSuchBucket", { status: 404 });
      const key = path.slice(prefix.length);
      if (req.method === "PUT") {
        objects.set(key, { bytes: new Uint8Array(await req.arrayBuffer()), type: req.headers.get("content-type") ?? "application/octet-stream" });
        return new Response(null, { status: 200, headers: { ETag: `"${key.length}"` } });
      }
      const o = objects.get(key);
      if (req.method === "HEAD" || req.method === "GET") {
        if (!o) return new Response(req.method === "GET" ? `<Error><Code>NoSuchKey</Code></Error>` : null, { status: 404 });
        const headers = { "Content-Type": o.type, "Content-Length": String(o.bytes.length), ETag: `"${o.bytes.length}"`, "Last-Modified": new Date(0).toUTCString() };
        return new Response(req.method === "GET" ? (o.bytes as Uint8Array<ArrayBuffer>) : null, { headers });
      }
      return new Response("MethodNotAllowed", { status: 405 });
    },
  });
  const env = {
    PLAY_BUCKET: bucket,
    PLAY_BUCKET_ENDPOINT: `http://127.0.0.1:${server.port}`,
    PLAY_BUCKET_REGION: "us-east-1",
    PLAY_BUCKET_ACCESS_KEY: "test-access",
    PLAY_BUCKET_SECRET_KEY: "test-secret",
  };
  return { objects, env, stop: () => server.stop(true) };
}
