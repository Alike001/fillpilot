export function GET() {
  return Response.json({
    service: "fillpilot-web",
    status: "ready",
    executionEnabled: false,
  });
}
