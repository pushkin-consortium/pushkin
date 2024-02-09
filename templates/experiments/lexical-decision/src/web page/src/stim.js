// Example stimuli

const stimArray = [
    { word_1: 'SOCKS', word_2: 'SHOE', both_words: true, related: true },
    { word_1: 'SLOW', word_2: 'FAST', both_words: true, related: true },
    { word_1: 'QUEEN', word_2: 'KING', both_words: true, related: true },
    { word_1: 'LEAF', word_2: 'TREE', both_words: true, related: true },

    { word_1: 'SOCKS', word_2: 'TREE', both_words: true, related: false },
    { word_1: 'SLOW', word_2: 'SHOE', both_words: true, related: false },
    { word_1: 'QUEEN', word_2: 'FAST', both_words: true, related: false },
    { word_1: 'LEAF', word_2: 'KING', both_words: true, related: false },

    { word_1: 'AGAIN', word_2: 'PLAW', both_words: false, related: false },
    { word_1: 'BOARD', word_2: 'TRUDE', both_words: false, related: false },
    { word_1: 'LIBE', word_2: 'HAIR', both_words: false, related: false },
    { word_1: 'MOCKET', word_2: 'MEET', both_words: false, related: false },

    { word_1: 'FLAFF', word_2: 'PLAW', both_words: false, related: false },
    { word_1: 'BALT', word_2: 'TRUDE', both_words: false, related: false },
    { word_1: 'LIBE', word_2: 'NUNE', both_words: false, related: false },
    { word_1: 'MOCKET', word_2: 'FULLOW', both_words: false, related: false }
]

export default stimArray;