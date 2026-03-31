export {};

declare global {
  namespace Deno {
    namespace env {
      function get(key: string): string | undefined;
    }

    function serve(handler: (request: Request) => Response | Promise<Response>): void;
  }
}
