import { HostDemoRuntime } from "./index.js";

export interface DemoController {
  destroy(): void;
}

function randomUpdate(points: number[]): number[] {
  return points.map((value) => Math.max(0, Math.round(value + (Math.random() - 0.5) * 20)));
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text) {
    element.textContent = text;
  }
  return element;
}

export async function mountHostDemo(container: HTMLElement): Promise<DemoController> {
  const runtime = new HostDemoRuntime();
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

  const root = createElement("div");
  root.style.display = "grid";
  root.style.gridTemplateColumns = "1fr 360px";
  root.style.gap = "16px";

  const modulePanel = createElement("div");
  const sidebar = createElement("div");
  sidebar.style.border = "1px solid #ddd";
  sidebar.style.padding = "12px";

  const moduleTitle = createElement("h3", "页面模块");
  modulePanel.appendChild(moduleTitle);
  const moduleList = createElement("div");
  modulePanel.appendChild(moduleList);

  const sidebarTitle = createElement("h3", "侧边栏 Chat");
  sidebar.appendChild(sidebarTitle);
  const selectedInfo = createElement("div", "未选择模块");
  selectedInfo.style.marginBottom = "8px";
  sidebar.appendChild(selectedInfo);

  const output = createElement("pre");
  output.style.minHeight = "120px";
  output.style.whiteSpace = "pre-wrap";
  output.style.background = "#fafafa";
  output.style.padding = "8px";
  sidebar.appendChild(output);

  const promptInput = createElement("textarea") as HTMLTextAreaElement;
  promptInput.rows = 3;
  promptInput.placeholder = "输入追问内容...";
  promptInput.style.width = "100%";
  sidebar.appendChild(promptInput);

  const sendBtn = createElement("button", "发送会话");
  sendBtn.style.marginTop = "8px";
  sidebar.appendChild(sendBtn);

  root.appendChild(modulePanel);
  root.appendChild(sidebar);
  container.appendChild(root);

  let currentSelectedId: string | undefined;
  const unsubs: Array<() => void> = [];

  const renderModules = (): void => {
    moduleList.innerHTML = "";
    for (const record of runtime.discoverModules()) {
      const module = runtime.getPageModule(record.identity.id);
      if (!module) {
        continue;
      }
      const card = createElement("div");
      card.style.border = "1px solid #ddd";
      card.style.padding = "8px";
      card.style.marginBottom = "8px";
      card.style.cursor = "pointer";
      card.style.background = currentSelectedId === module.id ? "#eef6ff" : "#fff";

      const title = createElement("strong", module.title);
      const points = createElement("div", `数据点: [${module.points.join(", ")}]`);
      const session = createElement("div", `会话ID: ${module.sessionId ?? "-"}`);
      const reply = createElement("div", `AI回复: ${module.aiReply ?? "-"}`);
      const updateBtn = createElement("button", "点击更新数据");
      updateBtn.style.marginTop = "6px";
      updateBtn.onclick = async (event) => {
        event.stopPropagation();
        await runtime.clickUpdate(module.id, randomUpdate(module.points));
        renderModules();
      };

      card.onclick = () => {
        currentSelectedId = module.id;
        runtime.selectModule(module.id);
        selectedInfo.textContent = `当前选择: ${module.title} (${module.id})`;
        renderModules();
      };

      card.appendChild(title);
      card.appendChild(points);
      card.appendChild(session);
      card.appendChild(reply);
      card.appendChild(updateBtn);
      moduleList.appendChild(card);
    }
  };

  sendBtn.onclick = async () => {
    if (!currentSelectedId) {
      output.textContent = "请先选择一个模块";
      return;
    }
    const userInput = promptInput.value.trim();
    if (!userInput) {
      output.textContent = "请输入问题";
      return;
    }
    const result = await runtime.chatOnSelectedModule({
      identityId: currentSelectedId,
      userInput,
      promptMode: "append"
    });
    output.textContent = `Session: ${result.sessionId}\n\n${result.reply}`;
    renderModules();
  };

  unsubs.push(
    runtime.subscribeSelection((records) => {
      if (records.length === 0) {
        selectedInfo.textContent = "未选择模块";
        return;
      }
      const selected = records[0];
      selectedInfo.textContent = `当前选择: ${selected.identity.id}`;
    }),
    runtime.subscribeConversation(() => {
      renderModules();
    })
  );

  renderModules();

  return {
    destroy(): void {
      for (const unsub of unsubs) {
        unsub();
      }
      container.removeChild(root);
    }
  };
}
