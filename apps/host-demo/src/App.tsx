import { useEffect, useMemo, useRef, useState } from "react";
import { HostDemoRuntime } from "./index.js";
import "./styles.css";

interface ModuleView {
  id: string;
  title: string;
  points: number[];
  sessionId?: string;
  aiReply?: string;
  cacheStatus: "hit" | "miss" | "stale" | "loading";
}

function randomUpdate(points: number[]): number[] {
  return points.map((value) => Math.max(0, Math.round(value + (Math.random() - 0.5) * 20)));
}

export function App() {
  const runtimeRef = useRef<HostDemoRuntime | null>(null);
  const [modules, setModules] = useState<ModuleView[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [chatOutput, setChatOutput] = useState("请选择模块并输入问题。");
  const [showReinterpret, setShowReinterpret] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedModule = useMemo(
    () => modules.find((item) => item.id === selectedId),
    [modules, selectedId]
  );

  useEffect(() => {
    const runtime = new HostDemoRuntime();
    runtimeRef.current = runtime;

    const refreshModules = async (): Promise<void> => {
      const records = runtime.discoverModules();
      const next = await Promise.all(
        records.map(async (record) => {
          const module = runtime.getPageModule(record.identity.id);
          const status = await runtime.checkInterpretationStatus(record.identity.id).catch(() => ({
            status: "miss" as const
          }));
          return {
            id: record.identity.id,
            title: module?.title ?? record.identity.id,
            points: module?.points ?? [],
            sessionId: module?.sessionId,
            aiReply: module?.aiReply,
            cacheStatus: status.status
          } satisfies ModuleView;
        })
      );
      setModules(next);
      setSelectedId((prev) => prev || next[0]?.id || "");
    };

    const bootstrap = async (): Promise<void> => {
      await runtime.registerInjectedModule({
        moduleId: "revenue-card",
        moduleName: "本周收入",
        series: [100, 120, 115, 130, 150],
        filters: ["region=APAC"]
      });
      await runtime.registerInjectedModule({
        id: "order-trend",
        title: "订单趋势",
        rows: [
          { x: "Mon", y: 20 },
          { x: "Tue", y: 22 },
          { x: "Wed", y: 28 }
        ],
        context: { filters: ["channel=online"] }
      });
      await refreshModules();
    };

    void bootstrap();
    const unsubs = [
      runtime.subscribeSelection(() => {
        void refreshModules();
      }),
      runtime.subscribeConversation(() => {
        void refreshModules();
      })
    ];

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
      runtimeRef.current = null;
    };
  }, []);

  const onSelectModule = (id: string): void => {
    setSelectedId(id);
    runtimeRef.current?.selectModule(id);
    setShowReinterpret(false);
  };

  const runChat = async (forceReinterpret: boolean): Promise<void> => {
    const runtime = runtimeRef.current;
    if (!runtime || !selectedId) {
      setChatOutput("请先选择一个模块。");
      return;
    }
    const currentQuestion = forceReinterpret ? lastQuestion : question.trim();
    if (!currentQuestion) {
      setChatOutput("请输入问题。");
      return;
    }

    setLoading(true);
    try {
      setLastQuestion(currentQuestion);
      const result = await runtime.chatOnSelectedModule({
        identityId: selectedId,
        userInput: currentQuestion,
        promptMode: "append",
        forceReinterpret
      });

      if (result.status === "stale") {
        setShowReinterpret(true);
        setChatOutput(result.hint ?? "数据已更新，请点击重新解读。");
        return;
      }

      setShowReinterpret(false);
      const modeLabel = result.status === "cache_hit" ? "缓存命中" : "新生成";
      setChatOutput(`[${modeLabel}] Session: ${result.sessionId ?? "-"}\n\n${result.reply ?? ""}`);
    } finally {
      setLoading(false);
    }
  };

  const onUpdateModule = async (id: string): Promise<void> => {
    const runtime = runtimeRef.current;
    const target = modules.find((item) => item.id === id);
    if (!runtime || !target) {
      return;
    }
    setLoading(true);
    try {
      await runtime.clickUpdate(id, randomUpdate(target.points));
      const records = runtime.discoverModules();
      const next = await Promise.all(
        records.map(async (record) => {
          const module = runtime.getPageModule(record.identity.id);
          const status = await runtime.checkInterpretationStatus(record.identity.id).catch(() => ({
            status: "miss" as const
          }));
          return {
            id: record.identity.id,
            title: module?.title ?? record.identity.id,
            points: module?.points ?? [],
            sessionId: module?.sessionId,
            aiReply: module?.aiReply,
            cacheStatus: status.status
          } satisfies ModuleView;
        })
      );
      setModules(next);
      setShowReinterpret(true);
      setChatOutput("数据已更新，请点击“重新解读”刷新 AI 分析。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout">
      <section className="modules">
        <h2>页面模块</h2>
        {modules.map((module) => (
          <article
            key={module.id}
            className={selectedId === module.id ? "card selected" : "card"}
            onClick={() => onSelectModule(module.id)}
          >
            <h3>{module.title}</h3>
            <p>模块ID: {module.id}</p>
            <p>数据点: [{module.points.join(", ")}]</p>
            <p>缓存状态: {module.cacheStatus}</p>
            <p>会话ID: {module.sessionId ?? "-"}</p>
            <p>AI回复: {module.aiReply ?? "-"}</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void onUpdateModule(module.id);
              }}
              disabled={loading}
            >
              点击更新
            </button>
          </article>
        ))}
      </section>

      <aside className="sidebar">
        <h2>智能侧边栏（Dify Chat）</h2>
        <p>当前选择: {selectedModule ? `${selectedModule.title} (${selectedModule.id})` : "未选择"}</p>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="请输入追问内容..."
          rows={4}
        />
        <div className="actions">
          <button type="button" onClick={() => void runChat(false)} disabled={loading}>
            发送会话
          </button>
          {showReinterpret ? (
            <button type="button" onClick={() => void runChat(true)} disabled={loading}>
              重新解读
            </button>
          ) : null}
        </div>
        <pre>{chatOutput}</pre>
      </aside>
    </div>
  );
}
