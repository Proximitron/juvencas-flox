import Progress from "../../../../systems/sfrpg/module/progress.js";
export class BetterPackLoader {
    constructor() {
        this.loadedPacks = {
            Actor: {},
            Item: {}
        }
    }
    async*loadPacks(s, e) {
        this.loadedPacks[s] || (this.loadedPacks[s] = {});
        const t = new Progress({
            steps: e.length
        });
        for (const a of e) {
            let e = this.loadedPacks[s][a];
            if (e) {
                const {pack: s} = e;
                t.advance(`Loading ${s.metadata.label}`)
            } else {
                const o = game.packs.get(a);
                if (t.advance(`Loading ${o.metadata.label}`),
                o.documentName !== s)
                    continue;
                {
                    const t = ["type", "system.level"];
                    "Actor" === s ? t.push("system.details.cr", "system.attributes.hp.max", "system.details.type", "system.traits.size", "system.details.organizationSize", "system.details.alignment") : t.push("system.pcu", "system.cost", "system.price", "system.weaponCategory", "system.class", "system.weaponType", "system.armor", "system.school", "system.type", "system.allowedClasses");
                    const c = await o.getIndex({
                        fields: t
                    });
                    this.setCompendiumArt(o.collection, c),
                        e = this.loadedPacks[s][a] = {
                            pack: o,
                            content: c
                        }
                }
            }
            yield e
        }
        t.close("Loading complete")
    }
    setCompendiumArt(s, e) {
        if (s.startsWith("sfrpg."))
            for (const t of e) {
                const e = game.sfrpg.compendiumArt.map.get(`Compendium.${s}.${t._id}`)
                    , a = e?.actor ?? e?.item;
                t.img = a ?? t.img
            }
    }
}
export const betterPackLoader = new BetterPackLoader;