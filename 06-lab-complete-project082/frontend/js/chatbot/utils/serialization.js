export function sortObjectDeep(value) {
  if (Array.isArray(value)) return value.map(sortObjectDeep);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObjectDeep(value[key]);
      return acc;
    }, {});
}

export function stableSerialize(value) {
  try {
    return JSON.stringify(sortObjectDeep(value));
  } catch {
    return String(value ?? "");
  }
}

function itemSignature(item) {
  return stableSerialize({
    experienceId: item?.experienceId || item?.meta?.__experienceId || "",
    kind: item?.kind || "",
    title: item?.title || "",
    meta: item?.meta || {},
  });
}

/**
 * Chuỗi ổn định để so sánh hai resume dock (trùng nội dung tương tác).
 * @param {any} dock
 */
export function resumeDockSignature(dock) {
  if (!dock || typeof dock !== "object") return "";
  if (dock.fullsetMixed) {
    return `mixed:${stableSerialize({
      experienceId: dock.experienceId || dock.fullsetMixed?.__experienceId || "",
      title: dock.title || "",
      fullsetMixed: dock.fullsetMixed || {},
      items: Array.isArray(dock.items) ? dock.items.map(itemSignature) : [],
    })}`;
  }
  if (Array.isArray(dock.items)) {
    return `bundle:${stableSerialize({
      title: dock.title || "",
      items: dock.items.map(itemSignature),
    })}`;
  }
  return `single:${stableSerialize({
    experienceId: dock.experienceId || dock.meta?.__experienceId || "",
    kind: dock.kind || "",
    title: dock.title || "",
    meta: dock.meta || {},
  })}`;
}
