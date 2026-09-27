import { IBankParser } from './base.parser';
import { PopularParser } from './popular.parser';
import { BhdParser } from './bhd.parser';
import { PromericaParser } from './promerica.parser';
import { QikParser } from './qik.parser';
import { RawEmailData, ParsedTransaction } from '../types';

export class BankParserFactory {
  private parsers: IBankParser[] = [
    new PopularParser(),
    new BhdParser(),
    new PromericaParser(),
    new QikParser()
  ];

  public parseEmail(email: RawEmailData): ParsedTransaction | null {
    for (const parser of this.parsers) {
      if (parser.canParse(email)) {
        try {
          const parsed = parser.parse(email);
          if (parsed) {
            return parsed;
          }
        } catch (err) {
          console.error(`Error parsing email with ${parser.bankName}:`, err);
        }
      }
    }
    return null;
  }

  public getSupportedBanks() {
    return this.parsers.map(p => ({
      code: p.bankCode,
      name: p.bankName
    }));
  }
}

export const bankParserFactory = new BankParserFactory();
