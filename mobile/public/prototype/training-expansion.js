/* Additional distinct, editable starter sessions for the weekly studio. */
TRAINING_PLANS.push(
 {id:'home-gentle-15',name:'М’який старт удома',place:'home',goal:'start',gear:'none',level:'beginner',minutes:15,tone:'blue',tag:'Повернення до руху',items:[['walk','3 хв легко'],['sit','2 × 8'],['wallpush','2 × 8'],['bird','2 × 6 / бік']]},
 {id:'home-legs-20',name:'Ноги без інвентарю',place:'home',goal:'strength',gear:'none',level:'beginner',minutes:20,tone:'lime',tag:'Нижня частина',items:[['sit','2 × 10'],['bridge','2 × 12'],['glute','2 × 8 / нога'],['calf','2 × 12']]},
 {id:'home-core-20',name:'Корпус і рівновага',place:'home',goal:'strength',gear:'none',level:'all',minutes:20,tone:'violet',tag:'Контроль руху',items:[['bird','2 × 8 / бік'],['deadbug','2 × 8 / бік'],['bridge','2 × 12'],['sideplank','2 × 20 с / бік']]},
 {id:'home-band-lower-30',name:'Ноги з резинкою',place:'home',goal:'muscle',gear:'band',level:'all',minutes:30,tone:'peach',tag:'Нижня частина',items:[['squat','3 × 10'],['lateralband','2 × 8 кроків / бік'],['bandhinge','3 × 10'],['bridge','2 × 12']]},
 {id:'home-band-upper-25',name:'Спина й руки з резинкою',place:'home',goal:'strength',gear:'band',level:'all',minutes:25,tone:'blue',tag:'Верх тіла',items:[['rowband','3 × 10'],['bandpress','2 × 10'],['pullapart','2 × 12'],['bandcurl','2 × 10']]},
 {id:'home-db-lower-30',name:'Гантелі · ноги й сідниці',place:'home',goal:'muscle',gear:'dumbbell',level:'all',minutes:30,tone:'lime',tag:'Нижня частина',items:[['goblet','3 × 8–10'],['hinge','3 × 10'],['reverse','2 × 8 / нога'],['calf','2 × 12']]},
 {id:'home-db-upper-30',name:'Гантелі · верх тіла',place:'home',goal:'strength',gear:'dumbbell',level:'all',minutes:30,tone:'violet',tag:'Верх тіла',items:[['dbrow','3 × 10 / рука'],['dbfloor','3 × 8'],['dbcurl','2 × 10'],['dbtriceps','2 × 10']]},
 {id:'gym-first-full-30',name:'Перше коло у залі',place:'gym',goal:'start',gear:'machine',level:'beginner',minutes:30,tone:'blue',tag:'Знайомство з залом',items:[['legpress','2 × 8–10'],['chest','2 × 8–10'],['lat','2 × 8–10'],['treadmill','5 хв легко']]},
 {id:'gym-back-arms-45',name:'Зал · спина й руки',place:'gym',goal:'muscle',gear:'machine',level:'all',minutes:45,tone:'violet',tag:'Верх тіла',items:[['lat','3 × 10'],['seatedrow','3 × 10'],['cableface','2 × 12'],['cablecurl','2 × 10'],['cabletriceps','2 × 10']]},
 {id:'gym-legs-45',name:'Зал · ноги й сідниці',place:'gym',goal:'muscle',gear:'machine',level:'all',minutes:45,tone:'peach',tag:'Нижня частина',items:[['legpress','3 × 10'],['hamcurl','3 × 10'],['extension','2 × 10'],['hipabduct','2 × 12']]},
 {id:'gym-chest-shoulders-40',name:'Зал · груди й плечі',place:'gym',goal:'strength',gear:'machine',level:'all',minutes:40,tone:'lime',tag:'Верх тіла',items:[['chest','3 × 8–10'],['seatedpress','2 × 10'],['pecdeck','2 × 10'],['cabletriceps','2 × 12']]},
 {id:'gym-cycle-25',name:'Велотренажер · 25 хв',place:'gym',goal:'cardio',gear:'machine',level:'beginner',minutes:25,tone:'blue',tag:'Комфортне кардіо',items:[['bike','5 хв легко'],['bike','15 хв комфортно'],['bike','5 хв легко']]},
 {id:'out-walk-30',name:'Прогулянка · 30 хв',place:'outdoor',goal:'cardio',gear:'none',level:'beginner',minutes:30,tone:'lime',tag:'Свій темп',items:[['walk','5 хв легко'],['walk','20 хв комфортно'],['walk','5 хв легко']]},
 {id:'out-walk-45',name:'Прогулянка · 45 хв',place:'outdoor',goal:'cardio',gear:'none',level:'all',minutes:45,tone:'peach',tag:'Довший маршрут',items:[['walk','5 хв легко'],['walk','35 хв комфортно'],['walk','5 хв легко']]},
 {id:'out-runwalk-30',name:'Біг + ходьба · 30 хв',place:'outdoor',goal:'cardio',gear:'none',level:'all',minutes:30,tone:'violet',tag:'Без поспіху',items:[['walk','5 хв легко'],['runwalk','5 × 2 хв легкої пробіжки + 2 хв ходьби'],['walk','5 хв легко']]}
);
const originalExpandedSportHomeCard=sportHomeCard;
sportHomeCard=function(){return originalExpandedSportHomeCard().replace(/\d+ ПРОГРАМ/,TRAINING_PLANS.length+' ПРОГРАМ');};
