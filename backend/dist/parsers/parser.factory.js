"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankParserFactory = exports.BankParserFactory = void 0;
const popular_parser_1 = require("./popular.parser");
const bhd_parser_1 = require("./bhd.parser");
const promerica_parser_1 = require("./promerica.parser");
const qik_parser_1 = require("./qik.parser");
class BankParserFactory {
    parsers = [
        new popular_parser_1.PopularParser(),
        new bhd_parser_1.BhdParser(),
        new promerica_parser_1.PromericaParser(),
        new qik_parser_1.QikParser()
    ];
    parseEmail(email) {
        for (const parser of this.parsers) {
            if (parser.canParse(email)) {
                try {
                    const parsed = parser.parse(email);
                    if (parsed) {
                        return parsed;
                    }
                }
                catch (err) {
                    console.error(`Error parsing email with ${parser.bankName}:`, err);
                }
            }
        }
        return null;
    }
    getSupportedBanks() {
        return this.parsers.map(p => ({
            code: p.bankCode,
            name: p.bankName
        }));
    }
}
exports.BankParserFactory = BankParserFactory;
exports.bankParserFactory = new BankParserFactory();
