// generator.js
Blockly.JavaScript.forBlock['tile_start'] = function (block, generator) {
  return generator.statementToCode(block, 'NEXT');
};

Blockly.JavaScript.forBlock['tile_go'] = function (block, generator) {
  const dir = block.getFieldValue('DIR');
  return `await tile_go("${dir}", 1);\n`;
};

Blockly.JavaScript.forBlock['tile_fill'] = function (block, generator) {
  const col = block.getFieldValue('COLOR');
  return `tile_fill("${col}");\n`;
};

Blockly.JavaScript.forBlock['custom_repeat'] = function (block, generator) {
  const repeats = block.getFieldValue('TIMES');
  const branch = generator.statementToCode(block, 'DO');
  return `for (let i = 0; i < ${repeats}; i++) {\n${branch}}\n`;
};
