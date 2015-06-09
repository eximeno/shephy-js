// Design:
//
// * There are several regions in the game;
//   Sheep Stock,
//   Field,
//   Hand,
//   Deck,
//   Discard pile,
//   Exile.
// * A region contains a pile of cards.
// * A pile of cards is expressed as an array.
// * The first card in an array is corresponding to
//   the bottom card in a pile or the first card put into the pile.
// * The last card in an array is corresponding to
//   the top card in a pile or the last card put into the pile.

var shephy = {};

(function (S, $) {
  // Utilities  {{{1
  S.RANKS = [1, 3, 10, 30, 100, 300, 1000];

  function max(xs) {
    return Math.max.apply(Math, xs);
  }

  function random(n) {
    return Math.floor(Math.random() * n);
  }

  function shuffle(xs) {
    for (var i = 0; i < xs.length; i++) {
      var j = random(xs.length - i);
      var tmp = xs[i];
      xs[i] = xs[j];
      xs[j] = tmp;
    }
  }

  S.delay = function(expressionAsFunction) {
    var result;
    var isEvaluated = false;

    return function () {
      if (!isEvaluated) {
        result = expressionAsFunction();
        isEvaluated = true;
      }
      return result;
    };
  };

  S.force = function (promise) {
    return promise();
  };

  S.clone = function (x) {
    return JSON.parse(JSON.stringify(x));
  };

  S.dropRank = function (rank) {
    if (rank == 1)
      return undefined;
    var r = rank % 3;
    if (r == 0)
      return rank / 3;
    else
      return rank * 3 / 10;
  };

  S.raiseRank = function (rank) {
    if (rank == 1000)
      return undefined;
    var r = rank % 3;
    if (r == 0)
      return rank * 10 / 3;
    else
      return rank * 3;
  };

  S.compositeRanks = function (ranks) {
    var rankSum = ranks.reduce(function (ra, r) {return ra + r;});
    var candidateRanks = S.RANKS.filter(function (r) {return r <= rankSum;});
    return max(candidateRanks);
  };

  function makeSheepCard(rank) {
    return {
      name: rank + '',
      rank: rank
    };
  }

  function makeSheepStockPile(rank) {
    var cards = [];
    for (var i = 0; i < 7; i++)
      cards.push(makeSheepCard(rank));
    return cards;
  }

  function makeEventCard(name) {
    return {
      name: name
    };
  }

  function cardType(card) {
    return card.type || (card.rank === undefined ? 'event' : 'sheep');
  }

  function makeInitalDeck() {
    var names = [
      'Duplicar',
      'Fructificar',
      'Fructificar',
      'Fructificar',
      'Apiñar',
      'Dominio',
      'Dominio',
      'Desprender',
      'Repoblar',
      'Florecer',
      'Pezuñas',
      'Inspiración',
      'Relámpago',
      'Meteorito',
      'Multiplicar',
      'Plaga',
      'Planificar',
      'Ovejero',
      'Fiebre',
      'Declive',
      'Tormenta',
      'Lobos'
    ];
    var cards = names.map(makeEventCard);
    shuffle(cards);
    return cards;
  }

  S.makeInitalWorld = function () {
    var sheepStock = {};
    S.RANKS.forEach(function (rank) {
      sheepStock[rank] = makeSheepStockPile(rank);
    });

    var initialSheepCard = sheepStock[1].pop();

    return {
      sheepStock: sheepStock,
      field: [initialSheepCard],
      enemySheepCount: 1,
      deck: makeInitalDeck(),
      hand: [],
      discardPile: [],
      exile: []
    };
  };

  S.gainX = function (world, rank) {
    if (world.sheepStock[rank].length == 0)
      return;
    if (7 - world.field.length <= 0)
      return;

    world.field.push(world.sheepStock[rank].pop());
  };

  S.releaseX = function (world, fieldIndex) {
    var c = world.field.splice(fieldIndex, 1)[0];
    world.sheepStock[c.rank].push(c);
  };

  S.discardX = function (world, handIndex) {
    var c = world.hand.splice(handIndex, 1)[0];
    world.discardPile.push(c);
  };

  S.exileX = function (world, region, index) {
    var c = region.splice(index, 1)[0];
    world.exile.push(c);
  };

  S.drawX = function (world) {
    if (world.deck.length == 0)
      return;
    if (5 - world.hand.length <= 0)
      return;

    world.hand.push(world.deck.pop());
  };

  S.remakeDeckX = function (world) {
    world.deck.push.apply(world.deck, world.discardPile);
    world.discardPile = [];
    shuffle(world.deck);
  };

  S.shouldDraw = function (world) {
    return world.hand.length < 5 && 0 < world.deck.length;
  };

  S.judgeGame = function (world) {
    if (world.field.some(function (c) {return c.rank == 1000;})) {
      return {
        result: 'win',
        description: '¡Has ganado!'
      };
    }
    if (world.enemySheepCount == 1000) {
      return {
        result: 'lose',
        description: 'Tu rival ha alcanzado las mil ovejas, has perdido.'
      };
    }
    if (world.field.length == 0) {
      return {
        result: 'lose',
        description: 'Has perdido todas tus ovejas, has perdido.'
      };
    }

    throw 'Invalid operation';
  };

  // Move sets  {{{2
  // NB: These functions are to make code declarative, but they're destructive.

  function automated(moves) {
    moves.automated = true;
    return moves;
  }

  function described(description, moves) {
    moves.description = description;
    return moves;
  }

  function mapOn(world, regionName, moveMaker) {
    return world[regionName].map(function (c, i) {
      var move = moveMaker(c, i);
      move.cardRegion = regionName;
      move.cardIndex = i;
      return move;
    });
  }

  // Core  {{{1
  S.makeGameTree = function (world, opt_state) {  //{{{2
    return {
      world: world,
      moves: S.listPossibleMoves(world, opt_state)
    };
  };

  S.listPossibleMoves = function (world, opt_state) {  //{{{2
    if (opt_state === undefined)
      return S.listPossibleMovesForBasicRules(world);
    else
      return S.listPossibleMovesForPlayingCard(world, opt_state);
  }

  S.listPossibleMovesForBasicRules = function (world) {  //{{{2
    // TODO: Add an option to continue the current game to compete high score.
    if (world.field.some(function (c) {return c.rank == 1000;}))
      return [];

    if (1000 <= world.enemySheepCount)
      return [];

    if (world.field.length == 0)
      return [];

    if (world.hand.length == 0 && world.deck.length == 0) {
      return automated([
        {
          description: 'Baraja el mazo y repón tu mano.',
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            S.remakeDeckX(wn);
            while (S.shouldDraw(wn))
              S.drawX(wn);
            wn.enemySheepCount *= 10;
            return S.makeGameTree(wn);
          })
        }
      ]);
    }

    if (S.shouldDraw(world)) {
      return automated([
        {
          description:
            5 - world.hand.length == 1
            ? 'Roba una carta'
            : 'Roba cartas',
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            while (S.shouldDraw(wn))
              S.drawX(wn);
            return S.makeGameTree(wn);
          })
        }
      ]);
    }

    return described('Elige una carta de tu mano para jugar',
      mapOn(world, 'hand', function (c, i) {
        return {
          description: 'Juegas ' + c.name,
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            S.discardX(wn, i);
            return S.makeGameTree(wn, {step: c.name});
          })
        };
      })
    );
  };

  S.listPossibleMovesForPlayingCard = function (world, state) {  //{{{2
    var h = cardHandlerTable[state.step] || unimplementedCardHandler;
    return h(world, state);
  };

  var cardHandlerTable = {};  //{{{2

  cardHandlerTable['Duplicar'] = function (world, state) {  //{{{2
    if (world.hand.length == 0) {
      return automated([{
        description: 'No tienes cartas en tu mano. No tiene efecto.',
        gameTreePromise: S.delay(function () {
          return S.makeGameTree(world);
        })
      }]);
    } else {
      return described('Elige la carta de tu mano cuya acción quieres duplicar.',
        mapOn(world, 'hand', function (c, i) {
          return {
            description: 'Duplicas ' + c.name,
            gameTreePromise: S.delay(function () {
              return S.makeGameTree(world, {step: c.name});
            })
          };
        })
      );
    }
  };

  cardHandlerTable['Fructificar'] = function (world, state) {  //{{{2
    if (state.rank === undefined) {
      if (world.field.length < 7) {
        return described('Elige una carta del pasto que quieras copiar',
          mapOn(world, 'field', function (c) {
            return {
              description: 'Copias la carta de oveja ' + c.rank,
              gameTreePromise: S.delay(function () {
                return S.makeGameTree(world, {step: state.step, rank: c.rank});
              })
            };
          })
        );
      } else {
        return automated([{
          description: 'Nada ocurre',
          gameTreePromise: S.delay(function () {
            return S.makeGameTree(world);
          })
        }]);
      }
    } else {
      return automated([{
        description: 'Gana una carta de oveja ' + state.rank,
        gameTreePromise: S.delay(function () {
          var wn = S.clone(world);
          S.gainX(wn, state.rank);
          return S.makeGameTree(wn);
        })
      }]);
    }
  };

  cardHandlerTable['Apiñar'] = function (world, state) {  //{{{2
    if (world.field.length <= 2) {
      return automated([{
        description: 'Pocas ovejas, no ocurre nada.',
        gameTreePromise: S.delay(function () {
          return S.makeGameTree(world);
        })
      }]);
    } else {
      return described('Elige una carta del pasto para descartar.',
        mapOn(world, 'field', function (c, i) {
          return {
            description: 'Descartas la carta de oveja ' + c.rank,
            gameTreePromise: S.delay(function () {
              var wn = S.clone(world);
              S.releaseX(wn, i);
              var sn = wn.field.length <= 2 ? undefined : state;
              return S.makeGameTree(wn, sn);
            })
          };
        })
      );;
    }
  };

  cardHandlerTable['Dominio'] = function (world, state) {  //{{{2
    var chosenIndice = state.chosenIndice || [];
    var moves =
      mapOn(world, 'field', function (c, i) {
        return {
          description: 'Elige una carta de oveja ' + c.rank,
          gameTreePromise: S.delay(function () {
            return S.makeGameTree(world, {
              step: state.step,
              chosenIndice: (chosenIndice || []).concat([i]).sort()
            });
          })
        };
      })
      .filter(function (m) {return chosenIndice.indexOf(m.cardIndex) == -1;});
    if (chosenIndice.length != 0) {
      moves.push({
        description: 'Combina las cartas elegidas',
        gameTreePromise: S.delay(function () {
          var wn = S.clone(world);
          for (var i = chosenIndice.length - 1; 0 <= i; i--)
            S.releaseX(wn, chosenIndice[i]);
          S.gainX(wn, S.compositeRanks(
            chosenIndice.map(function (i) {return world.field[i].rank;})
          ));
          return S.makeGameTree(wn);
        })
      });
    }

    if (chosenIndice.length == 0)
      moves.description = 'Elige una carta en el pasto para combinar';
    else if (chosenIndice.length != world.field.length)
      moves.description = 'Elige una carta en el pasto para combinar, o';
    else
      moves.automated = true;

    return moves;
  };

  cardHandlerTable['Desprender'] = function (world, state) {  //{{{2
    return described('Elige una carta en el pasto para descartar',
      mapOn(world, 'field', function (c, i) {
        return {
          description: 'Descartas la carta de oveja ' + c.rank,
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            S.releaseX(wn, i);
            return S.makeGameTree(wn);
          })
        };
      })
    );
  };

  cardHandlerTable['Repoblar'] = function (world, state) {  //{{{2
    var moves = [];
    if (world.field.length < 7) {
      moves.description = 'Gana una carta de oveja 1, o';
      moves.push({
        description: 'Gana una carta de oveja 1',
        cardRegion: 'sheepStock1',
        cardIndex: world.sheepStock[1].length - 1,
        gameTreePromise: S.delay(function () {
          var wn = S.clone(world);
          S.gainX(wn, 1);
          return S.makeGameTree(wn, state);
        })
      });
    } else {
      moves.description = 'No hay espacio en el pasto (máximo 7 cartas)';
      moves.automated = true;
    }
    moves.push({
      description: 'Cancelar',
      gameTreePromise: S.delay(function () {
        return S.makeGameTree(world);
      })
    });
    return moves;
  };

  cardHandlerTable['Florecer'] = function (world, state) {  //{{{2
    if (state.rank === undefined) {
      if (world.field.length < 7) {
        return described('Elige una carta en el pasto',
          mapOn(world, 'field', function (c) {
            return {
              description: 'Elige una carta de oveja ' + c.rank,
              gameTreePromise: S.delay(function () {
                return S.makeGameTree(world, {step: state.step, rank: c.rank});
              })
            };
          })
        );
      } else {
        return automated([{
          description: 'Nada ocurre',
          gameTreePromise: S.delay(function () {
            return S.makeGameTree(world);
          })
        }]);
      }
    } else {
      var lowerRank = S.dropRank(state.rank);
      if (lowerRank === undefined) {
        return automated([{
          description: 'No ganas nada',
          gameTreePromise: S.delay(function () {
            return S.makeGameTree(world);
          })
        }]);
      } else {
        var n = Math.min(3, 7 - world.field.length);
        return automated([{
          description:
            n == 1
            ? 'Ganas una carta de oveja ' + lowerRank
            : 'Ganas ' + n + ' cartas de oveja ' + lowerRank,
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            for (var i = 1; i <= n; i++)
              S.gainX(wn, lowerRank);
            return S.makeGameTree(wn);
          })
        }]);
      }
    }
  };

  cardHandlerTable['Pezuñas'] = function (world, state) {  //{{{2
    var highestRank = max(world.field.map(function (c) {return c.rank;}));
    var chosenIndice = state.chosenIndice || [];
    var moves = [];

    world.field.forEach(function (c, i) {
      if (c.rank < highestRank && chosenIndice.indexOf(i) == -1) {
        moves.push({
          description: 'Elige una carta de oveja ' + c.rank,
          cardRegion: 'field',
          cardIndex: i,
          gameTreePromise: S.delay(function () {
            return S.makeGameTree(world, {
              step: state.step,
              chosenIndice: (chosenIndice || []).concat([i]).sort()
            });
          })
        });
      }
    });
    if (moves.length != 0)
      moves.description = 'Elige una carta en el pasto, o'

    moves.push({
      description:
        chosenIndice.length == 0
        ? 'Cancelar'
        : 'Incrementas el rango de las cartas de oveja seleccionadas',
      gameTreePromise: S.delay(function () {
        var wn = S.clone(world);
        for (var i = chosenIndice.length - 1; 0 <= i; i--) {
          var c = world.field[chosenIndice[i]];
          S.releaseX(wn, chosenIndice[i]);
          S.gainX(wn, S.raiseRank(c.rank));
        }
        return S.makeGameTree(wn);
      })
    });
    if (moves.length == 1)
      moves.automated = true;

    return moves;
  };

  cardHandlerTable['Inspiración'] = function (world, state) {  //{{{2
    if (world.deck.length == 0) {
      return automated([{
        description: 'No hay cartas en el mazo, nada ocurre',
        gameTreePromise: S.delay(function () {
          return S.makeGameTree(world);
        })
      }]);
    } else if (state.searched === undefined) {
      return described('Elige una carta del mazo',
        mapOn(world, 'deck', function (c, i) {
          return {
            description: 'Pones la carta ' + c.name + ' en tu mano',
            gameTreePromise: S.delay(function () {
              var wn = S.clone(world);
              wn.hand.push(wn.deck.splice(i, 1)[0]);
              return S.makeGameTree(wn, {step: state.step, searched: true});
            })
          };
        })
      );
    } else {
      return automated([{
        description: 'Barajas el mazo',
        gameTreePromise: S.delay(function () {
          var wn = S.clone(world);
          shuffle(wn.deck);
          return S.makeGameTree(wn);
        })
      }]);
    }
  };

  cardHandlerTable['Relámpago'] = function (world, state) {  //{{{2
    var highestRank = max(world.field.map(function (c) {return c.rank;}));
    return described('Elige una carta del pasto para descartar',
      world.field
      .map(function (c, i) {return [c, i];})
      .filter(function (x) {return x[0].rank == highestRank;})
      .map(function (x) {
        return {
          description: 'Descartas la carta de oveja ' + x[0].rank,
          cardRegion: 'field',
          cardIndex: x[1],
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            S.releaseX(wn, x[1]);
            return S.makeGameTree(wn);
          })
        };
      })
    );
  };

  cardHandlerTable['Meteorito'] = function (world, state) {  //{{{2
    var n = Math.min(state.rest || 3, world.field.length);
    return described('Elige una carta del pasto para descartar',
      mapOn(world, 'field', function (c, i) {
        return {
          description: 'Descartas la carta de oveja ' + c.rank,
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            if (state.rest === undefined)
              S.exileX(wn, wn.discardPile, wn.discardPile.length - 1);
            S.releaseX(wn, i);
            var sn = n == 1 ? undefined : {step: state.step, rest: n - 1};
            return S.makeGameTree(wn, sn);
          })
        };
      })
    );
  };

  cardHandlerTable['Multiplicar'] = function (world, state) {  //{{{2
    if (world.field.length < 7 && 0 < world.sheepStock[3].length) {
      return automated([{
        description: 'Ganas una carta de oveja 3',
        gameTreePromise: S.delay(function () {
          var wn = S.clone(world);
          S.gainX(wn, 3);
          return S.makeGameTree(wn);
        })
      }]);
    } else {
      return automated([{
        description: 'Nada ocurre',
        gameTreePromise: S.delay(function () {
          return S.makeGameTree(world);
        })
      }]);
    }
  };

  cardHandlerTable['Plaga'] = function (world, state) {  //{{{2
    return described('Elige una carta de oveja del pasto para descartar',
      mapOn(world, 'field', function (c) {
        var r = c.rank;
        return {
          description: 'Descartas todas las cartas de oveja de rango ' + r,
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            for (var i = wn.field.length - 1; 0 <= i; i--) {
              if (wn.field[i].rank == r)
                S.releaseX(wn, i);
            }
            return S.makeGameTree(wn);
          })
        };
      })
    );
  };

  function uniq(xs) {
    var us = [];
    var found = {};
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i];
      if (!found[x]) {
        us.push(x);
        found[x] = true;
      }
    }
    return us;
  }

  cardHandlerTable['Planificar'] = function (world, state) {  //{{{2
    if (world.hand.length == 0) {
      return automated([{
        description: 'No hay cartas para eliminar, nada ocurre',
        gameTreePromise: S.delay(function () {
          return S.makeGameTree(world);
        })
      }]);
    } else {
      return described('Elige una carta de tu mano para eliminar',
        mapOn(world, 'hand', function (c, i) {
          return {
            description: 'Eliminas la carta' + c.name,
            gameTreePromise: S.delay(function () {
              var wn = S.clone(world);
              S.exileX(wn, wn.hand, i);
              return S.makeGameTree(wn);
            })
          };
        })
      );
    }
  };

  cardHandlerTable['Ovejero'] = function (world, state) {  //{{{2
    if (world.hand.length == 0) {
      return automated([{
        description: 'No hay cartas para descartar, nada ocurre',
        gameTreePromise: S.delay(function () {
          return S.makeGameTree(world);
        })
      }]);
    } else {
      return described('Elige una carta en tu mano para descartar',
        mapOn(world, 'hand', function (c, i) {
          return {
            description: 'Descartas' + c.name,
            gameTreePromise: S.delay(function () {
              var wn = S.clone(world);
              S.discardX(wn, i);
              return S.makeGameTree(wn);
            })
          };
        })
      );
    }
  };

  cardHandlerTable['Fiebre'] = function (world, state) {  //{{{2
    return automated([{
      description: 'Descartas todas las cartas de oveja',
      gameTreePromise: S.delay(function () {
        var wn = S.clone(world);
        while (1 <= wn.field.length)
          S.releaseX(wn, 0);
        return S.makeGameTree(wn);
      })
    }]);
  };

  cardHandlerTable['Declive'] = function (world, state) {  //{{{2
    if (world.field.length == 1) {
      return automated([{
        description: 'No hay ovejas para descartar, no ocurre nada',
        gameTreePromise: S.delay(function () {
          return S.makeGameTree(world);
        })
      }]);
    } else {
      var n = state.initialCount || world.field.length;
      var countToKeep = Math.ceil(n / 2);
      return described('Elige una carta en el pasto para descartar',
        mapOn(world, 'field', function (c, i) {
          return {
            description: 'Descartas la carta de oveja ' + c.rank,
            gameTreePromise: S.delay(function () {
              var wn = S.clone(world);
              S.releaseX(wn, i);
              var sn = wn.field.length == countToKeep
                ? undefined
                : {step: state.step, initialCount: n};
              return S.makeGameTree(wn, sn);
            })
          };
        })
      );
    }
  };

  cardHandlerTable['Tormenta'] = function (world, state) {  //{{{2
    var n = Math.min(state.rest || 2, world.field.length);
    return described('Elige una carta en el pasto para descartar',
      mapOn(world, 'field', function (c, i) {
        return {
          description: 'Descartas la carta de oveja ' + c.rank,
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            S.releaseX(wn, i);
            var sn = n == 1 ? undefined : {step: state.step, rest: n - 1};
            return S.makeGameTree(wn, sn);
          })
        };
      })
    );
  };

  cardHandlerTable['Lobos'] = function (world, state) {  //{{{2
    var highestRank = max(world.field.map(function (c) {return c.rank;}));
    if (highestRank == 1)
      return cardHandlerTable['Relámpago'](world, state);
    return described('Elige una carta en el pasto para decrementar su rango',
      world.field
      .map(function (c, i) {return [c, i];})
      .filter(function (x) {return x[0].rank == highestRank;})
      .map(function (x) {
        return {
          description: 'Decrementas el rango de la carta de oveja ' + x[0].rank,
          cardRegion: 'field',
          cardIndex: x[1],
          gameTreePromise: S.delay(function () {
            var wn = S.clone(world);
            S.releaseX(wn, x[1]);
            S.gainX(wn, S.dropRank(highestRank));
            return S.makeGameTree(wn);
          })
        };
      })
    );
  };

  function unimplementedCardHandler(world, state) {  //{{{2
    // TODO: Throw an error after all event cards are implemented.
    return [{
      description: 'Nothing happened (not implemented yet)',
      gameTreePromise: S.delay(function () {
        return S.makeGameTree(world);
      })
    }];
  };

  // UI  {{{1
  // TODO: Add UI to start a new game after finishing a game.
  // TODO: Add UI to quit the current game.
  // TODO: Choose a move automatically if it doesn't express a user's choice.
  //       Examples: "Draw cards" and "Remake Deck and fill Hand".
  // TODO: Render cards as a stack of card-like shapes, not text.
  // TODO: Make #world elements clickable to choose a move.
  //       For example:
  //       - Click a card in Hand to play the card.
  //       - Click a card in Field to duplicate by playing Be Fruitful.
  // TODO: Show a card text if the cursor is hovered on the card.

  function textizeCards(cs) {
    if (cs.length == 0)
      return '-';
    else
      return cs.map(function (c) {return c.name;}).join(', ');
  }

  var ruleTextFromCardNameTable = {
    'Duplicar': 'Elige una de las cartas de tu mano. Juega esta carta para duplicar el efecto de la elegida',
    'Fructificar': 'Duplica una de tus cartas de oveja',
    'Apiñar': 'Descarta todas tus cartas de oveja excepto dos',
    'Dominio': 'Selecciona cualquier número de cartas de oveja en el pasto.\nSuma sus valores y reemplázalas por una carta de oveja de igual o menos valor',
    'Desprender': 'Descarta una carta de oveja',
    'Repoblar': 'Coloca tantas cartas de oveja de valor 1 como quieras en el pasto',
    'Florecer': 'Elige una de tus cartas de oveja y recibe tres cartas de oveja de un rango inferior',
    'Pezuñas': 'Incrementa de rango todas las cartas de Oveja del pasto excepto la(s) de mayor rango',
    'Inspiración': 'Mira en el mazo, elige una carta de acción y baraja de nuevo el mazo',
    'Relámpago': 'Descarta tu carta de oveja de mayor rango',
    'Meteorito': 'Descarta tres cartas de oveja, y elmina esta carta del juego',
    'Multiplicar': 'Coloca una carta de oveja 3 en el pasto',
    'Plaga': 'Descarta todas las cartas de oveja de un rango',
    'Planificar': 'Elimina una carta de acción de tu mano del juego',
    'Ovejero': 'Descarta una carta de acción de tu mano',
    'Fiebre': 'Descarta siete cartas de oveja',
    'Declive': 'Descarta la mitad de tus cartas de oveja (redondeo hacia abajo)',
    'Tormenta': 'Descarta dos cartas de oveja',
    'Lobos': 'Decrementa el rango de la carta de oveja de mayor rango en uno.\nSi es de rango 1 descártala'
  };

  function helpTextFromCard(card) {
    return card.name + '\n' + ruleTextFromCardNameTable[card.name];
  }

  function makeFaceDownCards(n) {
    var cards = [];
    for (var i = 0; i < n; i++)
      cards.push({name: '', type: 'face-down'});
    return cards;
  }

  function visualizeCard(card) {
    var $body = $('<span>');
    $body.addClass('body');
    $body.text(card.name);

    var $border = $('<span>');
    $border.addClass('border');
    $border.append($body);

    var $card = $('<span>');
    $card.addClass('card');
    $card.addClass(cardType(card));
    $card.addClass('rank' + card.rank);
    if (cardType(card) === 'event')
      $card.attr('title', helpTextFromCard(card));
    $card.append($border);
    return $card;
  }

  function visualizeCards(cards) {
    return cards.map(visualizeCard);
  }

  function mayBeAutomated(gameTree) {
    return gameTree.moves.automated;
  }

  function descriptionOfMoves(moves) {
    if (moves.description)
      return moves.description;

    if (moves.length == 1)
      return moves[0].description;

    return 'Choose a move';
  }

  var AUTOMATED_MOVE_DELAY = 500;

  function processMove(m) {
    var gt = S.force(m.gameTreePromise);
    drawGameTree(gt);
    if (mayBeAutomated(gt)) {
      setTimeout(
        function () {processMove(gt.moves[0]);},
        AUTOMATED_MOVE_DELAY
      );
    }
  }

  function nodizeMove(m) {
    var $m = $('<input>');
    $m.attr({
      type: 'button',
      value: m.description
    });
    $m.click(function () {
      processMove(m);
    });
    return $m;
  }

  function drawGameTree(gameTree) {
    var w = gameTree.world;
    var deckRevealed = gameTree.moves.some(function (m) {
      return m.cardRegion === 'deck';
    });
    $('#enemySheepCount > .count').text(w.enemySheepCount);
    var v = {
      deck: visualizeCards(deckRevealed ? w.deck : makeFaceDownCards(w.deck.length)),
      field: visualizeCards(w.field),
      hand: visualizeCards(w.hand)
    };
    S.RANKS.forEach(function (rank) {
      var vcs = visualizeCards(w.sheepStock[rank]);
      v['sheepStock' + rank] = vcs;
      $('#sheepStock' + rank).html(vcs);
    });
    $('#field > .cards').html(v.field);
    $('#hand > .cards').html(v.hand);
    $('#deck > .cards').html(v.deck).toggleClass('lined', !deckRevealed);
    $('#discardPile > .cards').html(visualizeCards(w.discardPile));
    $('#exile > .cards').html(visualizeCards(w.exile));

    if (mayBeAutomated(gameTree)) {
      $('#message').text(descriptionOfMoves(gameTree.moves));
      $('#moves').empty();
    } else {
      $('#message').text(
        gameTree.moves.length == 0
        ? S.judgeGame(gameTree.world).description
        : descriptionOfMoves(gameTree.moves)
      );
      gameTree.moves
        .filter(function (m) {return m.cardRegion !== undefined;})
        .forEach(function (m) {
          v[m.cardRegion][m.cardIndex]
            .addClass('clickable')
            .click(function () {
              processMove(m);
            });
        });
      $('#moves')
        .empty()
        .append(
          gameTree.moves
          .filter(function (m) {return m.cardRegion === undefined;})
          .map(nodizeMove)
        );
    }
  }




  // Bootstrap  {{{1
  // TODO: Revise UI to start the first game after page load.
  //       (Show "Start a game" instead of "Draw cards)

  $(function () {
    processMove(S.makeGameTree(S.makeInitalWorld()).moves[0]);
  });

  //}}}1
})(shephy, jQuery);

// vim: expandtab softtabstop=2 shiftwidth=2 foldmethod=marker
