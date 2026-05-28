// blocks.js
registerFieldColour();
Blockly.defineBlocksWithJsonArray([
  {
    "type": "tile_start",
    "message0": "Start",
    "message0": "Start",
    "nextStatement": null,
    "style": "start_blocks",
    "tooltip": "Startpunkt des Programms.",
    "helpUrl": ""
  },
  {
    "type": "tile_go",
    "message0": "gehe Fliese nach %1",
    "args0": [
      { "type": "field_dropdown", "name": "DIR",
        "options": [["oben","UP"], ["unten","DOWN"], ["links","LEFT"], ["rechts","RIGHT"]]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#4C97FF",
    "tooltip": "Geht einen Schritt in die gewählte Richtung.",
    "helpUrl": ""
  },
  {
    "type": "tile_fill",
    "message0": "färbe Fliese %1",
    "args0": [
      { "type": "field_colour", "name": "COLOR", "colour": "#f0f" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#4C97FF",
    "tooltip": "Färbt die aktuelle Zelle.",
    "helpUrl": ""
  },
  {
    "type": "custom_repeat",
    "message0": "wiederhole %1 mal",
    "args0": [
      { "type": "field_number", "name": "TIMES", "value": 3, "min": 0, "max": 200, "precision": 1 }
    ],
    "message1": "%1",
    "args1": [
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#FFAB19",
    "tooltip": "Wiederholt die Befehle im Inneren der Schleife.",
    "helpUrl": ""
  }
]);
