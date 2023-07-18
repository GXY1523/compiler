// 测试

const { tokenizer, parser, transformer, codeGenerator } = require("./compiler");

const input = "(add 2 (subtract 4 2))";
// const output = "add(2,subtract(4,2))";

const tokens = tokenizer(input);
// console.log(tokenizer(input));

const ast = parser(tokens);
// console.log(parser(tokens));

const newAst = transformer(ast);
// console.log(JSON.stringify(newAst));

const output = codeGenerator(newAst);
console.log(output);
