import { ExchangeAdapter, ExchangeConfig } from "./ExchangeAdapter";
import { SimAdapter } from "./SimAdapter";
import { ExternalAdapter } from "./ExternalAdapter";

export class AdapterFactory {
  static create(config: ExchangeConfig): ExchangeAdapter {
    console.log("[AdapterFactory] Creating adapter with mode:", config.mode);

    if (config.mode === "SIM" || !config.apiKey) {
      console.log("[AdapterFactory] Using SimAdapter (paper trading)");
      return new SimAdapter(config);
    }

    console.log("[AdapterFactory] Using ExternalAdapter (live trading)");
    return new ExternalAdapter(config);
  }
}
