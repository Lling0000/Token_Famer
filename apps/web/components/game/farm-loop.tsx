import { Boxes, Sprout, Wheat } from 'lucide-react';

export function FarmLoop() {
  return (
    <ol className="farm-loop" aria-label="农场玩法流程">
      <li>
        <Sprout size={21} />
        <span>
          <b>01 · 播种照料</b>
          <small>选择模型花，照顾每块土地</small>
        </span>
      </li>
      <li>
        <Wheat size={21} />
        <span>
          <b>02 · 等待收获</b>
          <small>花朵成熟，收获 Token 包</small>
        </span>
      </li>
      <li>
        <Boxes size={21} />
        <span>
          <b>03 · 激活使用</b>
          <small>进入仓库激活，再播种或调用模型</small>
        </span>
      </li>
    </ol>
  );
}
