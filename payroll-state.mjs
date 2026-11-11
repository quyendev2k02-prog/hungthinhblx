// A saved draft is not a closed payroll period. Paid runs remain protected.
export function isPayrollLocked(run){return run?.locked===true||run?.paid===true}
