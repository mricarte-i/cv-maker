const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

let nextId = 0;
const pending = new Map<number, (r: any) => void>();

worker.onmessage = (e: MessageEvent) => {
  const { id, ...rest } = e.data;
  pending.get(id)?.(rest);
  pending.delete(id);
};

function call(type: string, payload?: unknown): Promise<any> {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage({ id, type, payload });
  });
}

export const initCompiler = () => call("init");
export const compileCv = (json: string) => call("compile", json);
