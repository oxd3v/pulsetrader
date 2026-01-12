import React, { useCallback } from "react";
import {
  TECHNICAL_LOGICS_TYPE,
  ConditionNode,
  GroupNode,
  ComparisonOperator,
  isConditionNode,
  isGroupNode,
} from "@/type/order";

import {
  FiTrash2,
  FiPlus,
  FiActivity,
  FiTrendingUp,
  FiDollarSign,
  FiLayers,
} from "react-icons/fi";

import {
  TbChartLine,
  TbChartDonut,
} from "react-icons/tb";

import { INDICATORS_KEY, TECHNICAL_INDICATORS } from "@/constants/common/frontend"


const TIMEFRAMES = [
  { value: "1", label: "1min" },
  { value: "5", label: "5min" },
  { value: "15", label: "15min" },
  { value: "60", label: "1hr" },
  { value: "240", label: "4hr" },
  { value: "1440", label: "Daily" },
];

const COMPARISON_OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: "GREATER_THAN", label: ">" },
  { value: "LESS_THAN", label: "<" },
  { value: "GREATER_THAN_OR_EQUAL", label: "≥" },
  { value: "LESS_THAN_OR_EQUAL", label: "≤" },
  { value: "EQUAL", label: "=" },
  { value: "NOT_EQUAL", label: "≠" },
];

const DEFAULT_CONDITION: ConditionNode = {
  operator: "GREATER_THAN",
  id: "RSI",
  type: "RSI",
  resolution: "1",
  period: 14,
  threshold: 30,
};

const DEFAULT_GROUP: GroupNode = {
  operator: "AND",
  logics: [DEFAULT_CONDITION],
};

interface LogicNodeProps {
  node: TECHNICAL_LOGICS_TYPE;
  onChange: (newNode: TECHNICAL_LOGICS_TYPE) => void;
  onDelete?: () => void;
  depth?: number;
  indexLabel?: string;
}

// Memoized LogicNode to prevent re-rendering the whole tree on input change
const LogicNode = React.memo<LogicNodeProps>(({
  node,
  onChange,
  onDelete,
  depth = 0,
  indexLabel = "1",
}) => {
  
  // Handlers for Condition Node
  const handleFieldChange = useCallback((field: keyof ConditionNode, value: any) => {
    if (isConditionNode(node)) {
        onChange({ ...node, [field]: value });
    }
  }, [node, onChange]);

  const handleIndicatorChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isConditionNode(node)) {
        const sel = INDICATORS_KEY.find((i:any) => i.id === e.target.value);
        const newNode = { 
            ...node, 
            id: e.target.value, 
            type: e.target.value 
        };
        if (sel?.defaultPeriod) newNode.period = sel.defaultPeriod;
        onChange(newNode);
    }
  }, [node, onChange]);

  // Handlers for Group Node
  const handleGroupOperatorChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      if(isGroupNode(node)) {
          onChange({ ...node, operator: e.target.value as "AND" | "OR" });
      }
  }, [node, onChange]);

  const addChild = useCallback((newChild: TECHNICAL_LOGICS_TYPE) => {
    if (isGroupNode(node)) {
      onChange({ ...node, logics: [...node.logics, newChild] });
    }
  }, [node, onChange]);

  const updateChild = useCallback((idx: number, child: TECHNICAL_LOGICS_TYPE) => {
    if (isGroupNode(node)) {
      const newLogics = [...node.logics];
      newLogics[idx] = child;
      onChange({ ...node, logics: newLogics });
    }
  }, [node, onChange]);

  const removeChild = useCallback((idx: number) => {
    if (isGroupNode(node)) {
      onChange({ ...node, logics: node.logics.filter((_, i) => i !== idx) });
    }
  }, [node, onChange]);


  // 1. Render Condition Node
  if (isConditionNode(node)) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-md p-2 space-y-2 border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-700">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
            Condition {indexLabel}
          </span>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <FiTrash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Indicator Select */}
          <div>
            <label className="text-[10px] text-gray-400 mb-0.5 block">Indicator</label>
            <select
              className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
              value={node.id}
              onChange={handleIndicatorChange}
            >
              {INDICATORS_KEY.map((i:any) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Select */}
          <div>
            <label className="text-[10px] text-gray-400 mb-0.5 block">Operator</label>
            <select
              className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
              value={node.operator}
              onChange={(e) => handleFieldChange("operator", e.target.value)}
            >
              {COMPARISON_OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Threshold Input */}
          <div>
            <label className="text-[10px] text-gray-400 mb-0.5 block">Threshold</label>
            <input
              type="number"
              className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
              value={node.threshold}
              onChange={(e) => handleFieldChange("threshold", parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Conditional Params (Timeframe/Period) */}
        {TECHNICAL_INDICATORS.includes(node.id) && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed border-gray-100 dark:border-gray-700">
            <div>
              <label className="text-[10px] text-gray-400 mb-0.5 block">Timeframe</label>
              <select
                className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                value={node.resolution || "1"}
                onChange={(e) => handleFieldChange("resolution", e.target.value)}
              >
                {TIMEFRAMES.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 mb-0.5 block">Period</label>
              <input
                type="number"
                className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                value={node.period || 14}
                onChange={(e) => handleFieldChange("period", parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Render Group Node
  if (isGroupNode(node)) {
    return (
      <div
        className={`rounded-lg p-3 border-l-4 ${
          node.operator === "AND" ? "border-l-blue-400 bg-blue-50/50 dark:bg-blue-900/10" : "border-l-orange-400 bg-orange-50/50 dark:bg-orange-900/10"
        } border-y border-r border-gray-200 dark:border-gray-700 ${depth > 0 ? "mt-2" : ""}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
              Logic Group
            </span>
            <select
              className={`px-2 py-0.5 text-xs font-bold rounded border ${
                 node.operator === "AND" ? "text-blue-600 border-blue-200 bg-blue-100" : "text-orange-600 border-orange-200 bg-orange-100"
              } focus:outline-none cursor-pointer`}
              value={node.operator}
              onChange={handleGroupOperatorChange}
            >
              <option value="AND">AND (All Match)</option>
              <option value="OR">OR (Any Match)</option>
            </select>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors">
              <FiTrash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="space-y-3 pl-2">
          {node.logics.map((logic, idx) => (
            <LogicNode
              key={idx}
              node={logic}
              onChange={(c) => updateChild(idx, c)}
              onDelete={() => removeChild(idx)}
              depth={depth + 1}
              indexLabel={`${indexLabel}.${idx + 1}`}
            />
          ))}
          
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
            <button
              onClick={() => addChild({ ...DEFAULT_CONDITION })}
              className="flex-1 py-1.5 text-[10px] border border-dashed border-gray-300 text-gray-600 dark:text-gray-400 rounded hover:bg-white dark:hover:bg-gray-800 hover:border-blue-400 transition-all flex justify-center items-center gap-1"
            >
              <FiPlus /> Condition
            </button>
            <button
              onClick={() => addChild({ ...DEFAULT_GROUP })}
              className="flex-1 py-1.5 text-[10px] border border-dashed border-blue-300 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex justify-center items-center gap-1"
            >
              <FiLayers /> Group
            </button>
          </div>
        </div>
      </div>
    );
  }
  return null;
});

interface TechnicalEntryProps {
  technicalEntries: TECHNICAL_LOGICS_TYPE | undefined | null;
  setTechnicalEntries: (logic: TECHNICAL_LOGICS_TYPE | undefined) => void;
  title?: string;
  disabled?: boolean;
}

const TechnicalEntry: React.FC<TechnicalEntryProps> = ({
  technicalEntries,
  setTechnicalEntries,
  title = "Technical Entry Conditions",
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {title}
        </h3>
        {technicalEntries && (
          <button
            onClick={() => setTechnicalEntries(undefined)}
            className="text-xs text-red-500 hover:text-red-600 font-medium"
          >
            Clear All
          </button>
        )}
      </div>
      
      {!technicalEntries ? (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => setTechnicalEntries(DEFAULT_CONDITION)}
            className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-400 transition-all group flex flex-col items-center gap-2"
          >
            <FiActivity className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">Single Condition</span>
          </button>
          <button
            onClick={() => setTechnicalEntries(DEFAULT_GROUP)}
            className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-400 transition-all group flex flex-col items-center gap-2"
          >
            <FiLayers className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">Group Logic</span>
          </button>
        </div>
      ) : (
        <LogicNode node={technicalEntries} onChange={setTechnicalEntries} />
      )}
    </div>
  );
};

export default TechnicalEntry;