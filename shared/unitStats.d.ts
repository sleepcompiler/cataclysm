export interface UnitStats {
    name: string;
    description: string;
    hp: number;
    attack: number;
    speed: number;
    movement: number;
    quirks?: Quirk[];
    moltsFrom?: string;
}
export declare const UNIT_DICTIONARY: Record<string, UnitStats>;
export interface BuildingStats {
    name: string;
    description: string;
    hp: number;
    speed: number;
    quirks?: Quirk[];
}
export declare const BUILDING_DICTIONARY: Record<string, BuildingStats>;
export interface TrapStats {
    name: string;
    description: string;
    quirks?: Quirk[];
}
export declare const TRAP_DICTIONARY: Record<string, TrapStats>;
export type QuirkTrigger = "start_of_turn" | "on_molt" | "combat_calculation" | "on_step" | "active";
export interface Quirk {
    id: string;
    name: string;
    description: string;
    trigger: QuirkTrigger;
    cost?: number;
}
