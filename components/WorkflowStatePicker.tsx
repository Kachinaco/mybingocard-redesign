"use client";

import { Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { MBC_STATES } from "@/lib/mbc-states";

type Props = {
  route?: string;
};

function Picker({ route }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const effectiveRoute = route ?? pathname;
  const states = useMemo(() => MBC_STATES[effectiveRoute] || [], [effectiveRoute]);
  const currentState = searchParams.get("state") || (states[0]?.id ?? "");

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      const url = new URL(window.location.href);
      if (value) {
        url.searchParams.set("state", value);
      } else {
        url.searchParams.delete("state");
      }
      window.history.replaceState({}, "", url.toString());
    },
    []
  );

  if (states.length === 0) return null;

  return (
    <label className="workflow-state-picker">
      <span>Preview workflow state</span>
      <select
        className="select-input"
        data-state-route={effectiveRoute}
        aria-label="Preview workflow state"
        value={currentState}
        onChange={handleChange}
      >
        {states.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <small>Switch states for local preview. The real page handlers remain active.</small>
    </label>
  );
}

export default function WorkflowStatePicker(props: Props) {
  return (
    <Suspense fallback={null}>
      <Picker {...props} />
    </Suspense>
  );
}
