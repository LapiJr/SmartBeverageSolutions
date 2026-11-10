/* ==========================================================================
   Vienna Konditorei: menu data
   Edit prices and items here. The menu page and the "A few favourites"
   block on the home page are built from this list in both languages.

   price: a number in euros (use a dot: 9.90). Use null for "ask our staff".
   desc:  short description, in English (en) and Dutch (nl), or null.
   highlight: true shows the item in a red box (like Bitterballen).

   Note: the HTML pages also contain a copy of the menu so search engines
   can read it. Visitors always see the version from this file.
   ========================================================================== */
window.MENU_DATA = {
  "currency": "EUR",
  "labels": {
    "en": {
      "special": "Special"
    },
    "nl": {
      "special": "Special"
    }
  },
  "categories": [
    {
      "id": "breakfast",
      "nav": {
        "en": "Breakfast",
        "nl": "Ontbijt"
      },
      "title": {
        "en": "Breakfast",
        "nl": "Ontbijt"
      },
      "note": null,
      "groups": [
        {
          "title": null,
          "note": null,
          "items": [
            {
              "name": "French Start",
              "price": 9.9,
              "desc": {
                "en": "coffee + fresh orange juice + croissant",
                "nl": "koffie + verse jus d'orange + croissant"
              }
            },
            {
              "name": "Avocado Toast (sourdough)",
              "price": 10.0,
              "desc": {
                "en": "avocado spread + tomato + egg + salad",
                "nl": "avocadospread + tomaat + ei + salade"
              }
            },
            {
              "name": "Croissant",
              "price": 3.5,
              "desc": {
                "en": "with butter or jam +0.50 / ham or cheese +1.00",
                "nl": "met boter of jam +0,50 / ham of kaas +1,00"
              }
            },
            {
              "name": "Pain au Chocolat",
              "price": 3.7,
              "desc": {
                "en": "croissant with chocolate",
                "nl": "croissant met chocolade"
              }
            },
            {
              "name": "Cinnamon Roll",
              "price": 4.2,
              "desc": {
                "en": "with whipped cream +0.50",
                "nl": "met slagroom +0,50"
              }
            },
            {
              "name": "Toasted Banana Bread",
              "price": 4.5,
              "desc": {
                "en": "with butter or jam +0.50",
                "nl": "met boter of jam +0,50"
              }
            },
            {
              "name": "Granola Pot",
              "price": 8.5,
              "desc": {
                "en": "granola + yoghurt + banana + walnuts",
                "nl": "granola + yoghurt + banaan + walnoten"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "toasties",
      "nav": {
        "en": "Toasties",
        "nl": "Tosti's"
      },
      "title": {
        "en": "Toasties",
        "nl": "Tosti's"
      },
      "note": null,
      "groups": [
        {
          "title": null,
          "note": null,
          "items": [
            {
              "name": "Cheese",
              "price": 5.8,
              "desc": null
            },
            {
              "name": "Ham + Cheese",
              "price": 6.3,
              "desc": null
            },
            {
              "name": "Cheese + Tomato",
              "price": 6.3,
              "desc": null
            },
            {
              "name": "Cheese + Pineapple",
              "price": 6.5,
              "desc": null
            },
            {
              "name": "Cheese + Salami",
              "price": 6.5,
              "desc": null
            },
            {
              "name": "Cheese + Chorizo",
              "price": 6.5,
              "desc": null
            },
            {
              "name": "Cheese + Ginger",
              "price": 6.5,
              "desc": null
            },
            {
              "name": "Special",
              "price": 7.8,
              "desc": {
                "en": "pesto + chicken + tomato + cheese",
                "nl": "pesto + kip + tomaat + kaas"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "sandwiches",
      "nav": {
        "en": "Sandwiches",
        "nl": "Broodjes"
      },
      "title": {
        "en": "Sandwiches",
        "nl": "Broodjes"
      },
      "note": {
        "en": "Served with sourdough",
        "nl": "Op zuurdesembrood"
      },
      "groups": [
        {
          "title": null,
          "note": null,
          "items": [
            {
              "name": "Hummus (V)",
              "price": 10.5,
              "desc": {
                "en": "hummus + cucumber + tomato + salad",
                "nl": "hummus + komkommer + tomaat + salade"
              }
            },
            {
              "name": "Tuna Salad",
              "price": 11.0,
              "desc": {
                "en": "tuna + red onion + egg + salad",
                "nl": "tonijn + rode ui + ei + salade"
              }
            },
            {
              "name": "Filet American",
              "price": 11.0,
              "desc": {
                "en": "egg + onion + mayonnaise + salad",
                "nl": "ei + ui + mayonaise + salade"
              }
            },
            {
              "name": "Smoked Chicken",
              "price": 12.5,
              "desc": {
                "en": "avocado + bacon + truffle mayonnaise + salad",
                "nl": "avocado + bacon + truffelmayonaise + salade"
              }
            },
            {
              "name": "Smoked Salmon",
              "price": 12.5,
              "desc": {
                "en": "cream cheese + honey mustard + salad",
                "nl": "roomkaas + honingmosterd + salade"
              }
            },
            {
              "name": "Goat Cheese & Parma Ham",
              "price": 13.0,
              "desc": {
                "en": "honey + walnuts",
                "nl": "honing + walnoten"
              }
            },
            {
              "name": "Old Amsterdam Cheese",
              "price": 12.0,
              "desc": {
                "en": "bacon + egg + honey mustard + salad",
                "nl": "bacon + ei + honingmosterd + salade"
              }
            },
            {
              "name": "Carpaccio",
              "price": 12.5,
              "desc": {
                "en": "parmesan cheese + truffle mayonnaise + salad",
                "nl": "Parmezaanse kaas + truffelmayonaise + salade"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "paninis",
      "nav": {
        "en": "Paninis",
        "nl": "Panini's"
      },
      "title": {
        "en": "Paninis",
        "nl": "Panini's"
      },
      "note": null,
      "groups": [
        {
          "title": null,
          "note": null,
          "items": [
            {
              "name": "Chicken",
              "price": 10.0,
              "desc": {
                "en": "tomato + cheese",
                "nl": "tomaat + kaas"
              }
            },
            {
              "name": "Brie Cheese",
              "price": 10.0,
              "desc": {
                "en": "honey + walnut",
                "nl": "honing + walnoot"
              }
            },
            {
              "name": "Mozzarella",
              "price": 10.0,
              "desc": {
                "en": "tomato + pesto",
                "nl": "tomaat + pesto"
              }
            },
            {
              "name": "Vegan",
              "price": 10.0,
              "desc": {
                "en": "tomato + cheese (V)",
                "nl": "tomaat + kaas (V)"
              }
            },
            {
              "name": "Bitterballen",
              "price": 9.5,
              "desc": {
                "en": "6 pieces with mustard",
                "nl": "6 stuks met mosterd"
              },
              "highlight": true
            }
          ]
        }
      ]
    },
    {
      "id": "salads",
      "nav": {
        "en": "Salads",
        "nl": "Salades"
      },
      "title": {
        "en": "Salads",
        "nl": "Salades"
      },
      "note": null,
      "groups": [
        {
          "title": null,
          "note": null,
          "items": [
            {
              "name": "Chicken",
              "price": 15.0,
              "desc": null
            },
            {
              "name": "Goat Cheese",
              "price": 15.0,
              "desc": null
            },
            {
              "name": "Caprese",
              "price": 15.0,
              "desc": null
            },
            {
              "name": "Smoked Salmon",
              "price": 15.0,
              "desc": null
            }
          ]
        }
      ]
    },
    {
      "id": "cakes",
      "nav": {
        "en": "Cakes",
        "nl": "Taart"
      },
      "title": {
        "en": "Cakes & Pies",
        "nl": "Taart & gebak"
      },
      "note": null,
      "groups": [
        {
          "title": null,
          "note": null,
          "items": [
            {
              "name": "Bossche Bol",
              "price": 5.8,
              "desc": null
            },
            {
              "name": "Hazelnut Cake",
              "price": 6.0,
              "desc": null
            },
            {
              "name": "Apple Pie",
              "price": 5.8,
              "desc": null
            },
            {
              "name": "Cheese Cake",
              "price": 5.8,
              "desc": null
            },
            {
              "name": "Carrot Cake",
              "price": 5.8,
              "desc": null
            },
            {
              "name": "Date Cake",
              "price": 4.5,
              "desc": null
            },
            {
              "name": "Cake of the Day",
              "price": null,
              "desc": {
                "en": "ask our staff",
                "nl": "vraag het aan ons team"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "hot-drinks",
      "nav": {
        "en": "Hot drinks",
        "nl": "Warme dranken"
      },
      "title": {
        "en": "Hot drinks",
        "nl": "Warme dranken"
      },
      "note": null,
      "groups": [
        {
          "title": null,
          "note": null,
          "items": [
            {
              "name": "Coffee",
              "price": 3.7,
              "desc": null
            },
            {
              "name": "Americano",
              "price": 3.7,
              "desc": null
            },
            {
              "name": "Espresso",
              "price": 3.3,
              "desc": null
            },
            {
              "name": "Double Espresso",
              "price": 4.3,
              "desc": null
            },
            {
              "name": "Espresso Macchiato",
              "price": 3.6,
              "desc": null
            },
            {
              "name": "Double Espresso Macchiato",
              "price": 4.6,
              "desc": null
            },
            {
              "name": "Cortado",
              "price": 3.6,
              "desc": null
            },
            {
              "name": "Cappuccino",
              "price": 3.9,
              "desc": null
            },
            {
              "name": "Latte Macchiato",
              "price": 4.2,
              "desc": null
            },
            {
              "name": "Flat White",
              "price": 4.9,
              "desc": null
            },
            {
              "name": "Hot Chocolate Milk",
              "price": 4.5,
              "desc": null
            },
            {
              "name": "Mocca",
              "price": 5.7,
              "desc": null
            },
            {
              "name": "Chai Latte",
              "price": 5.0,
              "desc": null
            },
            {
              "name": "Matcha Latte",
              "price": 6.0,
              "desc": null
            }
          ]
        },
        {
          "title": {
            "en": "Tea",
            "nl": "Thee"
          },
          "note": null,
          "items": [
            {
              "name": "Tea (organic)",
              "price": 3.9,
              "desc": {
                "en": "aged earl grey, gunpowder green, ginger lemon, jasmine green, rooibos South Africa",
                "nl": "aged earl grey, gunpowder groen, gember citroen, jasmijn groen, rooibos Zuid-Afrika"
              }
            },
            {
              "name": "Fresh Ginger Tea",
              "price": 4.7,
              "desc": null
            },
            {
              "name": "Fresh Mint Tea",
              "price": 4.7,
              "desc": null
            }
          ]
        },
        {
          "title": {
            "en": "Coffee supplements",
            "nl": "Extra bij je koffie"
          },
          "note": null,
          "items": [
            {
              "name": "Alternative milk",
              "price": 0.5,
              "desc": {
                "en": "soy / oat / almond / coconut",
                "nl": "soja / haver / amandel / kokos"
              }
            },
            {
              "name": "Decaf / Whipped cream",
              "price": 0.5,
              "desc": null
            },
            {
              "name": "Extra shot",
              "price": 1.0,
              "desc": null
            }
          ]
        }
      ]
    },
    {
      "id": "cold-drinks",
      "nav": {
        "en": "Cold drinks",
        "nl": "Koude dranken"
      },
      "title": {
        "en": "Cold drinks",
        "nl": "Koude dranken"
      },
      "note": null,
      "groups": [
        {
          "title": {
            "en": "Iced",
            "nl": "IJskoud"
          },
          "note": null,
          "items": [
            {
              "name": "Ice Tea",
              "price": 4.2,
              "desc": {
                "en": "lemon / green / peach",
                "nl": "citroen / groen / perzik"
              }
            },
            {
              "name": "Ice Coffee (Frappé)",
              "price": 6.0,
              "desc": null
            },
            {
              "name": "Ice Latte / Americano",
              "price": 6.0,
              "desc": null
            },
            {
              "name": "Ice Mocca",
              "price": 6.7,
              "desc": null
            },
            {
              "name": "Ice Matcha",
              "price": 6.7,
              "desc": {
                "en": "strawberry syrup optional",
                "nl": "eventueel met aardbeiensiroop"
              }
            }
          ]
        },
        {
          "title": {
            "en": "Soft drinks",
            "nl": "Frisdranken"
          },
          "note": null,
          "items": [
            {
              "name": "Chaudfontaine",
              "price": 4.2,
              "desc": {
                "en": "sparkling / still",
                "nl": "bruisend / plat"
              }
            },
            {
              "name": "Coca Cola",
              "price": 4.2,
              "desc": {
                "en": "regular / zero",
                "nl": "regular / zero"
              }
            },
            {
              "name": "Bitter Lemon",
              "price": 4.2,
              "desc": null
            },
            {
              "name": "Tonic / Rivella",
              "price": 4.2,
              "desc": null
            },
            {
              "name": "Chocomel / Fristi",
              "price": 4.6,
              "desc": null
            },
            {
              "name": "Kombucha Yaya",
              "price": 5.9,
              "desc": null
            },
            {
              "name": "Ginger Beer",
              "price": 4.8,
              "desc": null
            },
            {
              "name": "Rose Lemonade Sparkling",
              "price": 6.0,
              "desc": null
            },
            {
              "name": "Lemonade",
              "price": 6.0,
              "desc": null
            },
            {
              "name": "Tonic Espresso",
              "price": 6.7,
              "desc": null
            },
            {
              "name": "Almdudler",
              "price": 5.5,
              "desc": null
            }
          ]
        }
      ]
    },
    {
      "id": "juices",
      "nav": {
        "en": "Juices",
        "nl": "Sappen"
      },
      "title": {
        "en": "Juices",
        "nl": "Sappen"
      },
      "note": null,
      "groups": [
        {
          "title": null,
          "note": null,
          "items": [
            {
              "name": "Fresh Orange Juice (small)",
              "price": 4.7,
              "desc": null
            },
            {
              "name": "Fresh Orange Juice (large)",
              "price": 5.9,
              "desc": null
            },
            {
              "name": "Apple Juice Appeleare",
              "price": 4.5,
              "desc": null
            },
            {
              "name": "Pear Juice Appeleare",
              "price": 4.5,
              "desc": null
            },
            {
              "name": "Smoothie",
              "price": 7.0,
              "desc": {
                "en": "changes daily",
                "nl": "wisselt elke dag"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "bites",
      "nav": {
        "en": "Bites & snacks",
        "nl": "Borrel & snacks"
      },
      "title": {
        "en": "Bites & Snacks",
        "nl": "Borrel & snacks"
      },
      "note": null,
      "groups": [
        {
          "title": {
            "en": "Bites",
            "nl": "Borrelplanken"
          },
          "note": {
            "en": "served with sourdough",
            "nl": "met zuurdesembrood"
          },
          "items": [
            {
              "name": "Meat Plank",
              "price": 22.0,
              "desc": {
                "en": "salami / serrano ham / fuet / chorizo, olives / olive oil / balsamic vinegar",
                "nl": "salami / serranoham / fuet / chorizo, olijven / olijfolie / balsamicoazijn"
              }
            },
            {
              "name": "Cheese Plank",
              "price": 20.0,
              "desc": {
                "en": "brie / old amsterdam / gorgonzola, olives / olive oil / balsamic vinegar",
                "nl": "brie / old amsterdam / gorgonzola, olijven / olijfolie / balsamicoazijn"
              }
            }
          ]
        },
        {
          "title": {
            "en": "Snacks",
            "nl": "Snacks"
          },
          "note": null,
          "items": [
            {
              "name": "Nuts",
              "price": 5.5,
              "desc": null
            },
            {
              "name": "Olives",
              "price": 6.0,
              "desc": null
            },
            {
              "name": "Sourdough Bread & Butter",
              "price": 8.0,
              "desc": null
            },
            {
              "name": "Cheese",
              "price": 6.5,
              "desc": null
            }
          ]
        }
      ]
    }
  ]
};
