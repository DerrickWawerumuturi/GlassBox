/*
 * The Market tab's views, in dial order. The view lives in the URL
 * (?view=gaps); anything unknown, including the cut Landscape view
 * (decisions/market-navigation.md), opens Overview.
 */
export const MARKET_VIEWS = [
    {id: "overview", name: "Overview"},
    {id: "demand", name: "Demand"},
    {id: "yours", name: "Your skills"},
    {id: "gaps", name: "Gaps"},
] as const;

export type MarketViewId = typeof MARKET_VIEWS[number]["id"];

export function viewFrom(requested: string | null): MarketViewId {
    return MARKET_VIEWS.find((v) => v.id === requested)?.id ?? "overview";
}
