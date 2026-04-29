import React from "react";

const isDev = import.meta.env.DEV;
const appMode = import.meta.env.MODE || "unknown";

const createErrorId = (type = "render") =>
  `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const getErrorMessage = (error) => {
  if (!error) {
    return "Erreur inconnue.";
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || String(error);
};

const getErrorName = (error) => {
  if (!error || typeof error === "string") {
    return "RuntimeError";
  }

  return error.name || "RuntimeError";
};

const removeQueryString = (value) => value.replace(/[?#].*$/, "");

const simplifySource = (source = "") => {
  const cleanedSource = removeQueryString(source);

  try {
    const url = new URL(cleanedSource);
    const srcIndex = url.pathname.indexOf("/src/");

    if (srcIndex >= 0) {
      return url.pathname.slice(srcIndex + 1);
    }

    return url.pathname.split("/").filter(Boolean).slice(-3).join("/") || cleanedSource;
  } catch {
    const normalized = cleanedSource.replace(/\\/g, "/");
    const srcIndex = normalized.indexOf("/src/");

    if (srcIndex >= 0) {
      return normalized.slice(srcIndex + 1);
    }

    return normalized.split("/").filter(Boolean).slice(-3).join("/") || cleanedSource;
  }
};

const parseStackFrames = (stack = "") => {
  if (!stack || typeof stack !== "string") {
    return [];
  }

  return stack
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(?:at\s+)?(?:(.*?)\s+\()?((?:https?:\/\/|file:\/\/\/|\/|[A-Za-z]:\/|[A-Za-z]:\\).+?):(\d+):(\d+)\)?$/);

      if (!match) {
        return null;
      }

      const [, rawFunctionName, source, lineNumber, columnNumber] = match;

      return {
        functionName: rawFunctionName?.replace(/^at\s+/, "").trim() || "anonymous",
        source,
        file: simplifySource(source),
        line: Number(lineNumber),
        column: Number(columnNumber)
      };
    })
    .filter(Boolean);
};

const getUniqueFrames = (frames) => {
  const seen = new Set();

  return frames.filter((frame) => {
    const key = `${frame.file}:${frame.line}:${frame.column}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const getFrames = ({ error, errorInfo, source }) => {
  const frames = [
    source?.filename
      ? {
          functionName: "window",
          source: source.filename,
          file: simplifySource(source.filename),
          line: Number(source.lineno || 0),
          column: Number(source.colno || 0)
        }
      : null,
    ...parseStackFrames(error?.stack),
    ...parseStackFrames(errorInfo?.componentStack)
  ].filter(Boolean);

  return getUniqueFrames(frames).slice(0, 8);
};

const buildDiagnostics = ({ error, errorInfo, eventType, errorId, frames }) => {
  const primaryFrame = frames[0];
  const lines = [
    `Incident: ${errorId}`,
    `Type: ${eventType || "render"}`,
    `Mode: ${appMode}`,
    `Nom: ${getErrorName(error)}`,
    `Message: ${getErrorMessage(error)}`,
    `Fichier: ${primaryFrame?.file || "Non detecte"}`,
    `Ligne: ${primaryFrame?.line || "-"}`,
    `Colonne: ${primaryFrame?.column || "-"}`
  ];

  if (error?.stack) {
    lines.push("", "Stack JS:", error.stack);
  }

  if (errorInfo?.componentStack) {
    lines.push("", "Stack React:", errorInfo.componentStack);
  }

  return lines.join("\n");
};

const CodeBlock = ({ children }) => (
  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-3xl border border-white/10 bg-black/40 p-4 text-left text-xs leading-6 text-stone-200 shadow-inner">
    {children}
  </pre>
);

const FrameList = ({ frames }) => {
  if (!frames.length) {
    return (
      <div className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50">
        Aucun fichier source n'a ete detecte dans la stack. En dev, Vite devrait afficher les lignes des fichiers JSX.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {frames.map((frame, index) => (
        <div key={`${frame.file}-${frame.line}-${frame.column}-${index}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-300">
              #{index + 1}
            </span>
            <span className="text-xs text-stone-400">{frame.functionName}</span>
          </div>
          <p className="mt-3 break-words font-mono text-sm text-white">{frame.file}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-400">
            ligne {frame.line || "-"} - colonne {frame.column || "-"}
          </p>
        </div>
      ))}
    </div>
  );
};

export class AppErrorBoundary extends React.Component {
  state = {
    copied: false,
    error: null,
    errorId: null,
    errorInfo: null,
    eventType: null,
    source: null
  };

  static getDerivedStateFromError(error) {
    return {
      error,
      errorId: createErrorId("render"),
      eventType: "render"
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[AppErrorBoundary]", error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  handleWindowError = (event) => {
    if (this.state.error) {
      return;
    }

    this.setState({
      error: event.error || new Error(event.message || "Erreur runtime non capturee."),
      errorId: createErrorId("runtime"),
      eventType: "runtime",
      source: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  };

  handleUnhandledRejection = (event) => {
    if (this.state.error) {
      return;
    }

    const reason = event.reason instanceof Error ? event.reason : new Error(getErrorMessage(event.reason));

    this.setState({
      error: reason,
      errorId: createErrorId("promise"),
      eventType: "promise"
    });
  };

  reset = () => {
    this.setState({
      copied: false,
      error: null,
      errorId: null,
      errorInfo: null,
      eventType: null,
      source: null
    });
  };

  reload = () => {
    window.location.reload();
  };

  copyDiagnostics = async () => {
    const frames = getFrames(this.state);
    const diagnostics = buildDiagnostics({ ...this.state, frames });

    try {
      await navigator.clipboard.writeText(diagnostics);
      this.setState({ copied: true });
    } catch {
      this.setState({ copied: false });
    }
  };

  render() {
    const { children } = this.props;
    const { copied, error, errorId, errorInfo, eventType } = this.state;

    if (!error) {
      return children;
    }

    const frames = getFrames(this.state);
    const diagnostics = buildDiagnostics({ ...this.state, frames });
    const primaryFrame = frames[0];

    return (
      <main
        className="relative min-h-screen overflow-hidden px-4 py-8 text-white sm:px-6 lg:px-8"
        style={{
          background:
            "radial-gradient(circle at 12% 15%, rgba(201, 141, 112, 0.34), transparent 30%), radial-gradient(circle at 82% 10%, rgba(125, 72, 50, 0.28), transparent 32%), linear-gradient(135deg, #191617 0%, #2b1f1d 48%, #0f0c0b 100%)"
        }}
      >
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full border border-brand-300/20 bg-brand-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full border border-white/10 bg-white/10 blur-3xl" />

        <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-brand-100">
              Oops boundary
            </div>
            <h1 className="mt-6 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              Quelque chose s'est mal passe, mais l'app reste debuggable.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
              Une erreur a ete interceptee avant de casser toute l'interface. Les details ci-dessous donnent le message,
              le fichier, la ligne et la stack utile pour corriger rapidement.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">Incident</p>
                <p className="mt-2 break-all font-mono text-xs text-white">{errorId}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">Capture</p>
                <p className="mt-2 text-sm font-semibold text-white">{eventType || "render"}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">Mode</p>
                <p className="mt-2 text-sm font-semibold text-white">{appMode}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
                onClick={this.reset}
              >
                Reessayer
              </button>
              <button
                type="button"
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                onClick={this.reload}
              >
                Recharger
              </button>
              <button
                type="button"
                className="rounded-full border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-stone-200 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30"
                onClick={this.copyDiagnostics}
              >
                {copied ? "Details copies" : "Copier les details"}
              </button>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-[#151211]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-6">
            <div className="rounded-3xl border border-red-300/20 bg-red-500/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-100">{getErrorName(error)}</p>
              <h2 className="mt-3 break-words text-xl font-bold text-white">{getErrorMessage(error)}</h2>
              <p className="mt-3 text-sm text-stone-300">
                {primaryFrame
                  ? `${primaryFrame.file}:${primaryFrame.line}:${primaryFrame.column}`
                  : "Aucune ligne source precise n'a ete trouvee."}
              </p>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-300">Fichiers et lignes</h3>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] text-stone-400">
                  {frames.length} frame{frames.length > 1 ? "s" : ""}
                </span>
              </div>
              <FrameList frames={frames} />
            </div>

            <details className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4" open={isDev}>
              <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.24em] text-stone-300">
                Details techniques
              </summary>
              <div className="mt-4">
                <CodeBlock>{diagnostics}</CodeBlock>
              </div>
            </details>
          </aside>
        </section>
      </main>
    );
  }
}
