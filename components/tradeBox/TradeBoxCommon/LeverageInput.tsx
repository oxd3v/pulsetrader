import InfoTooltip from "./BoxTooltip";
import NumberInput from "./NumberInput";

interface LevrageInputProps {
  leverage: number;
  leverageMultiplier: number;
  setLevrage: (value: number) => void;
  setLevrageMultiplier: (value: number) => void;
}

const LeverageInput = ({
  leverage,
  leverageMultiplier,
  setLevrage,
  setLevrageMultiplier,
}: LevrageInputProps) => {
  return (
    <div className="space-y-2">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
        Leverage
        <InfoTooltip id="sl-tooltip" content={"Levrage settings"} />
      </label>
      <div className="grid xl:grid-cols-2 gap-4">
        <NumberInput
          inputLabel="Levrager"
          toolTipMessage="leverage"
          value={leverage}
          onChange={setLevrage}
          notValid={Number(leverage) > 1 && (leverage === 0 || !leverage)}
        />
        <NumberInput
          inputLabel="Levrager Multiplier"
          toolTipMessage="leverage Multiplier"
          value={leverageMultiplier}
          onChange={setLevrageMultiplier}
          notValid={
            Number(leverageMultiplier) > 1 &&
            (leverageMultiplier === 0 || !leverageMultiplier)
          }
        />
      </div>
    </div>
  );
};

export default LeverageInput;
