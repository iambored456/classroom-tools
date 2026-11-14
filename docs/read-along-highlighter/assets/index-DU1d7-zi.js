(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const f of o.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&n(f)}).observe(document,{childList:!0,subtree:!0});function a(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(s){if(s.ep)return;s.ep=!0;const o=a(s);fetch(s.href,o)}})();const at="classroom-tools.motion-preference",Qe="full",pt="classroom-tools:motion-change",M=typeof window>"u"?void 0:window,nt=M?.matchMedia?.("(prefers-reduced-motion: reduce)"),mt=new Set,ft=e=>e==="system"||e==="full"||e==="reduced";function Re(e=Qe){try{const t=M?.localStorage.getItem(at);return ft(t)?t:Qe}catch{return e}}let D=Re();function st(){const e=nt?.matches??!1;return{preference:D,systemReducedMotion:e,reducedMotion:D==="system"?e:D==="reduced"}}const kt=()=>st().reducedMotion;function ie(){const e=st();M&&(M.document.documentElement.dataset.motionPreference=e.preference,M.document.documentElement.dataset.reducedMotion=String(e.reducedMotion),M.dispatchEvent(new CustomEvent(pt,{detail:e}))),mt.forEach(t=>t(e))}M&&(ie(),nt?.addEventListener("change",ie),M.addEventListener("storage",e=>{e.key!==at&&e.key!==null||(D=Re(D),ie())}),M.addEventListener("pageshow",()=>{D=Re(D),ie()}));const ot=[{id:"8",title:"I Sit, I Tap",text:`I Sit, I Tap

I sit. I tap.
I sit and I tap.
I tap and I sit.
Pim and I sit.
Pim and I tap.`},{id:"9",title:"The Pin in the Map",text:`The Pin in the Map

A map. I tap the map.
A tin. A pin is in the tin.
I tap the pin. I tap it in.
The pin is in the map.`},{id:"10",title:"The Pit",text:`The Pit

A pit. Min is in the pit.
Nat is in the pit.
Min and Nat fit.
Min and Nat sit in the pit.
Sap is in the pit.
Min and Nat sat in sap!`},{id:"11",title:"Sam and Pam",text:`Sam and Pam

Sam is tan. Pam is tan.
Pam is as tan as Sam.
Sam and Pam sat on the mat.
Sam and Pam tap the mat.
Sam and Pam tap and tap and tap.
Sam and Pam nap.`},{id:"12",title:"Tom and the Fan",text:`Tom and the Fan

Tom is a man.
Tom is not a fan.
A fan is not a man.
Tom is on the mat.
The fan is on the mat.
Tom and the fan fit on the mat.`},{id:"13",title:"Sid and Dad",text:`Sid and Dad

Dad is sad. Dad did not fit in the pit.
Sid is not sad. Sid can fit in the pit.
Dad is mad. Dad did not sit in the pit.
Sid is not mad. Sid can sit in the pit.`},{id:"14",title:"The Cat Can",text:`The Cat Can

Can Cam fit on the cot?
Cam can not fit on the cot.
Can the cat fit on the cot?
The cat can fit on the cot.
The cat can nap on the cot.
Cam can not nap on the cot.
Cam can nap on the mat.`},{id:"15",title:"The Pup",text:`The Pup

The pup is up! The pup is on us. It’s fun.
Mom said the pup can sit on the mat in the sun.
The pup did not sit on the mat.
The pup is in the mud!`},{id:"16",title:"Gus the Dog",text:`Gus the Dog

Gus is a dog. Gus the dog is fun.
Gus the dog can dig. Gus can dig in a pit.
Gus dug and dug and dug.
Gus dug in the mud!
“Gus! Do not dig in the mud!” said Mom.`},{id:"17",title:"A Bug on the Bus",text:`A Bug on the Bus

Sib got on the bus. Bob, Gab, and Bim got on the bus.
A big bad bug got on the bus.
“I can not sit on the bus,” said Sib.
Sib got up. Bob got up. Gab got up, and Bim got up.
But the big bad bug did not.`},{id:"18",title:"Ten on the Bed",text:`Ten on the Bed

Mom and Dad get a big bed.
Ben and Ted get on the big bed.
Gab and Dot get on the big bed.
Tam the cat and Gus the dog get on the big bed.
Ned and Ed get on the big bed.
Mom and Dad get on the big bed.
Ten fit on the big bed!`},{id:"19",title:"I See",text:`I See

I see a pig. The pig is in its pen.
I see a cat. The cat is on the bed.
I see a dog. The dog is in its den.
I see a bug. The bug is on a bat!`},{id:"20",title:"Pet Cats",text:`Pet Cats

Tam and Meg got cats.
“The cats can fit on the bed,” said Tam.
“The cats can sit on top of the cot,” said Meg.
Tam pets the cats. Meg pets the cats.
The cats nap.`},{id:"21",title:"Cubs in the Den",text:`Cubs in the Den

Mom sees the cubs.
Mom and the cubs get in the den. The den is big.
Mom sits in the den.
The cubs see bugs and bats in the den.
The cubs get the bugs. The cubs do not get the bats.
Mom and the cubs nap in the den.`},{id:"22",title:"Kip is the Best Pup",text:`Kip is the Best Pup

Kip is the best pup. Kip sits. Kip skips.
Kip runs in the sun. Kip runs fast to get a disk.
But Kip did not see the mud.
“Stop, Kip!” Dad said.
But Kip can not stop. Kip skids into the mud.
Dad gets Kip in the tub.`},{id:"23",title:"The Big Hut",text:`The Big Hut

The hen sits in the big hut.
The hog sees the hut. The hog asks the hen if he can sit in the hut.
The hog and the hen sit in the hut.
The dog sees the hut. The dog asks the hen if he can sit in the hut.
The dog, the hog, and the hen sit in the big hut.`},{id:"24",title:"The Red Cat and the Rat",text:`The Red Cat and the Rat

The red cat sees a rat. The rat runs.
The red cat runs to get the rat.
The rat is fast. The red cat is not as fast.
The rat runs to a raft. The rat got on the raft.
The red cat did not fit on the raft.
The rat got rid of the red cat.`},{id:"25",title:"The Drums",text:`The Drums

Greg and Brent get drums.
Greg’s drum is big and red.
Greg taps the drum. The drum is fun.
Greg trips and drops his drum. BAM!
The drum is bent. Greg is sad.
“Do not fret, Greg,” said Brent.
Brent grabs his drum and hands it to Greg.
Greg grins at Brent. Greg and Brent tap Brent’s drum.`},{id:"26",title:"Lost in the Lab",text:`Lost in the Lab

Gil is in a big lab. Gil got lost in the big lab.
The lamp in the lab is not on. Gil can not see.
“Help!” said Gil.
Mel gets to the lab. Mel can help.
Mel taps the lamp. The lamp is on.
Gil can see at last! Mel hands Gil his books.
Gil left the lab.`},{id:"27",title:"Slugs on a Plant",text:`Slugs on a Plant

Glen and Al are slugs. Glen and Al are pals.
Al can not run. Glen can not trot.
Glen and Al are not fast.
Al is glum. “Slugs can not do a lot,” Al said.
“Slugs can rest!” Glen said.
Glen and Al plop on top of a plant.
Slugs are the best at rest.
Al is glad. Glen and Al nap on the plant.`},{id:"28",title:"A Hog in the Mud",text:`A Hog in the Mud

Wes is a hog. A hog is a big pig.
The sun is up. Wes’ skin is hot.
He rolls in the mud in his pen.
Wes is wet. The mud drip, drip, drips from his skin.
“Ahh!” said Wes. He is glad he gets to sit in the mud.`},{id:"29",title:"The Jet",text:`The Jet

Jim is in a jet. The jet is fast.
His job is to jump from the jet.
He sees a pond he can jump in.
Jim jumps from the jet.
He lands in the pond and gets wet.
Jim swims in the pond and looks up at the jet.`},{id:"30",title:"Yams! Yum!",text:`Yams! Yum!

A yak looks at a plant. It’s a yam plant.
The yak digs to get a yam from the plant.
The yak stomps on the yam to cut it into bits.
A dog sees the plant. The dog digs to get a yam from the plant.
The dog can not stomp on the yam.
The yak helps the dog.
“Yum,” said the yak, “yams are the best!”
“Yes,” said the dog, “yum, yum, yum!”`},{id:"31",title:"The Box",text:`The Box

Pax got a big red box from his dad.
“Look at this box!” Pax said to Rex. “Let’s jump in it.”
Pax jumps in the big red box. Rex is next.
“Can you help me, Pax?” said Rex.
“Yes! I can help you,” said Pax.
Pax helps Rex get in the box.
Pax and Rex jump in the box.
“The box is fun!” said Pax and Rex.`},{id:"32",title:"Do Not Quit!",text:`Do Not Quit!

Quint is next to run. He is on a quest to win.
He can not quit. “You can not quit,” said his mom.
“You can do it,” said his dad.
Quint runs fast. He can see the end.
“You can do it,” said his dad.
Quint gets to the end and wins.
“Yes! I went fast! I did the best!” said Quint.`},{id:"33",title:"What is a Vet?",text:`What is a Vet?

What can vets do? Vets help pets.
Can a vet help a dog? Yes, a vet can help a dog.
Can a vet help a cat? Yes, a vet can help lots of pets.
Can a vet help kids? No, a vet can not help kids.
Vets just help pets. Vets have a fun job.`},{id:"34",title:"Zip the Tent",text:`Zip the Tent

Jaz and Zed went on a trip in a tent.
Jaz sets up the tent. Zed helps.
“Look at the pond,” said Jaz. “Let’s swim!”
Jaz and Zed jump in the pond to swim.
Jaz and Zed see lots of bugs.
“You have to zip up the tent,” said Jaz.
“If you zip it, the bugs do not get in.”
Zed runs to the tent to zip it up. The bugs do not get in.`},{id:"35a",title:"Bag of Hats and Caps",text:`Bag of Hats and Caps

Jax has a big bag.
The bag has hats and caps in it.
Six hats and ten caps fit in the bag.
“Can I have a hat?” asks Gab.
“Yes, you can have a hat,” said Jax.
“Can I have a cap?” asks Kat.
“Yes, you can have a cap,” said Jax.
Gab and Kat are glad to have the hat and cap.`},{id:"35b",title:"Let’s Plan a Trip",text:`Let’s Plan a Trip

Sam plans a trip to camp.
Sam asks Dan to plan the trip with him.
Dan said, “Yes! Let’s plan a trip! What do we have to do?”
“We have to get the van and the tents,” said Sam.
“I can get the van if you can get the tents,” said Dan.
Dan gets the van. Sam gets the tents.
The men are glad to be on a trip to camp.`},{id:"35c",title:"Vlad the Crab",text:`Vlad the Crab

Vlad is a crab. Vlad the crab ran on the sand.
A crab trap was in the sand.
Vlad did not see the trap. Vlad ran into the trap.
“Help!” said Vlad.
Dax the crab sees Vlad. “I can help you!” said Dax.
Dax acts fast. He grabs Vlad.
Dax and Vlad ran from the trap. The crabs are glad.`},{id:"36a",title:"Gil and His Pig",text:`Gil and His Pig

Gil has a big pig. His pig is in its big pen.
A mud pit is in the pen.
The pig can swim in the mud pit.
The pig can dig in the mud pit.
The pig has a lot of fun in the mud pit.
Gil grins at his pig. The pig grins at Gil.`},{id:"36b",title:"Trip to the Pond",text:`Trip to the Pond

Tim and his six dogs are on a trip to the pond.
The dogs do flips in the mud and spin in the sand.
Next, Tim and his six dogs jump in the pond for a swim.
Tim said, “I see a disk.”
The dogs swim to get the disk.
Tim and his dogs are wet. Drip! Drip! Drip!
“The trip to the pond was fun,” said Tim.
“Yip, Yip,” said the six dogs.`},{id:"37a",title:"It’s Hot!",text:`It’s Hot!

Mom and Dad went for a jog.
Mom and Dad got hot.
Is the fan on? The fan is not on.
The fan is in the box.
Mom set the fan on top of the box.
Dad taps the fan on.
The fan is on. It’s not hot!`},{id:"37b",title:"Lost",text:`Lost

Dom is lost. He went to look at a frog and lost his mom.
He can not spot his mom.
Is Mom at the camp? No. Mom is not at the camp.
Is Mom in the sandbox? No. Mom is not in the sandbox.
Dom stops at the pond. He can see his mom!
He runs to his mom.
Dom and his mom look at frogs in the pond.`},{id:"38a",title:"The Big Box",text:`The Big Box

Nils, Jon, and Mag got a big box.
What is in the box?
Nils looks in the box.
Nils sees a hat in the box.
Jon looks in the box.
Jon sees a map in the box.
Mag looks in the box.
Mag sees a book in the box.
Next, the kids see pots and pans and bats in the box.
A lot is in this box!`},{id:"38b",title:"Brad Quits",text:`Brad Quits

Fran and Brad are in a band.
“I quit,” said Brad.
Brad grabs his bag. He slams it into the van.
Fran can see Brad is mad.
Fran and Brad get in the van.
“You are mad,” said Fran.
Brad hits his bag. “Yes! I am mad,” said Brad.
Fran grabs his hand. “Let’s rest a bit.”
Brad grins. “Yes. Let’s rest.”
Brad and Fran rest a bit.
“I am not mad,” said Brad, “I do not quit.”
“I am glad,” said Fran.`},{id:"39a",title:"Cub and Pup",text:`Cub and Pup

Cub and Pup are buds.
Cub and Pup have lots of fun.
Cub runs in the sun.
Pup digs in the mud.
Cub and Pup are hot and wet.
The fun must stop.
Cub and Pup must get in the tub.
The buds have fun in the suds.
The fun did not stop!`},{id:"39b",title:"Gus the Pup",text:`Gus the Pup

Gus the pup was in the mud.
He dug in the mud and got a bug.
Gus ran to the rug with his bug.
Mom sees Gus on the rug.
“No Gus! No bugs on the rug!”
Mom jumps up to stop Gus, but he is fast.
Gus runs to the mud.
Mom grabs Gus and dumps him in the tub.
Mom scrubs Gus. Gus looks glum.
Mom pets Gus. Gus is not glum.`},{id:"40a",title:"The Pet Hen",text:`The Pet Hen

Dex has a pet hen.
The hen is big and red.
Dex let his hen run.
But the hen ran into a pig pen.
The hen has a big welt.
Dex must tend to his red hen.
He gets the hen in its bed.
“You must rest,” Dex said.`},{id:"40b",title:"Fred and the Tent",text:`Fred and the Tent

Fred is at camp.
He must set up his tent.
Oh no! The tent has a rip in it.
Fred must mend the tent.
What can help Fred mend the tent?
A kit can help him mend the tent.
Fred mends and tests the tent. It is set up!`},{id:"41a",title:"The Fox and the Red Hen",text:`The Fox and the Red Hen

The fox can not get up.
He is in a pit.
The red hen looks at the fox.
“Oh no! You are in the pit.”
“Yes, I am in the pit. Can you help me?” asks the fox.
“Yes, I can help, but do not jump on me!” said the red hen.
The red hen helps the fox.
The fox did not jump on the red hen.
The red hen and the fox are glad the fox is not in the pit.`},{id:"41b",title:"The Frog and the Slug",text:`The Frog and the Slug

Glen is a frog with black spots.
Glen is in the pond. The pond has pads.
Glen can jump from pad to pad.
He can flip and flop on the pads in the pond.
Glen sees a slug in the pond. The slug is on a pad.
“Do you have legs to jump?” Glen asks the slug.
“I do not have legs. I can not jump,” said the slug.
Glen lets the slug get on his back.
Look! Glen and the slug can jump from pad to pad!`},{id:"41c",title:"A Craft for Mom",text:`A Craft for Mom

Brent and Clint must get Mom a gift.
The kids went to Gram’s Craft Stand.
Brent helps Clint cut ten red dots.
Next, Clint helps Brent stamp six red spots.
The gift Brent and Clint craft is a crest.
The kids set the crest in a box.
The crest Brent and Clint craft is grand.
“Yes!” said Mom, “This is the best gift. You are the best kids.”`},{id:"42",title:"Buzz Sells Milk",text:`Buzz Sells Milk

Buzz has a fun job.
His job is to sell jugs of milk at the mill.
Buzz runs up a tall grass hill to get the milk.
He huffs and puffs at the top of the hill.
Buzz fills six glass jugs with milk.
Not a drop spills.
Next, Buzz runs the milk jugs to the mill.
Buzz sees Tiff, Will, and Russ at the mill.
“Do you want milk?” asks Buzz.
“Yes!” yell the pals.
The pals get the jugs. The boss gets the bill.
Buzz did a swell job.`},{id:"43",title:"Let’s Golf",text:`Let’s Golf

Ross and his mom went to the mall.
Ross got golf clubs and golf balls.
The golf balls are small.
The man from the mall said Ross can hit the balls in the hall.
Ross taps the ball with the club.
The ball rolls up the hall and hits the tall wall.
“Look at me!” Ross calls to Mom from the hall.
He did not want to stop but Mom said he had to go.
It was fun to hit golf balls in the mall!`},{id:"44",title:"The Mud Track",text:`The Mud Track

Mack and Rick are at the mud track.
The pals see lots of trucks.
The big truck gets stuck in the mud.
The small truck goes fast on the track.
Mack and Rick clap.
Mack goes to the snack stand to grab chips.
At the snack stand, he sees his pals, Beck and Nick.
Rick sees the pack at the snack stand and yells, “Get back, quick!”
The pals run back to the track.
A truck ran into a stack of bricks!
The pack yells and jumps.
“The mud track is the best,” says Mack.`},{id:"45",title:"The Ship",text:`The Ship

Look at the ship. Trish and Josh jump on the ship deck.
Trish has a net to get fish.
Josh has a bag to get shells.
Trish jumps off the ship with the net. She swims to get fish.
Josh jumps off the ship with his bag. He swims to get shells.
Trish and Josh get back on the ship.
“Look at the fish in my net,” said Trish.
“Look at the shells in my bag,” said Josh.
We had fun on the ship.`},{id:"46",title:"This and That",text:`This and That

Jack and Finn want to go to the pond.
Finn picks this red hat.
Jack picks that pink hat.
Finn picks this big backpack.
Jack picks that small backpack.
Finn and Jack walk to Liz.
Liz will go with them to the pond.
Finn, Jack, and Liz jump off the rocks and splash in the pond.
Finn, Jack, and Liz had a ball at the pond.`},{id:"47",title:"Thump! Thump! Thud!",text:`Thump! Thump! Thud!

Thad and Cath go on a jog at camp.
They have six paths to pick from.
They pick the fifth path.
Thump! Thump! Thud!
“What was that?” asks Cath.
Thad looks and sees a big rock on the path.
“This rock fell from that hill. That was the thud,” says Thad.
“Both of us were in luck that we did not get hit!” says Cath.
“Let’s go on the sixth path back to camp,” says Thad.
Thad and Cath jog back to camp.
At camp they grab a wet cloth to wash off.
“That was a fun jog,” said Thad.`},{id:"48",title:"Chips and Dip",text:`Chips and Dip

Chuck and Rich are at lunch.
Chuck has chips in his lunchbox but no dip.
Rich has dip in his lunchbox but no chips.
Chuck looks at Rich. Rich looks at Chuck.
What can they do?
Chuck dumps his chips on a dish.
“Rich, do you want chips?” Chuck asks.
“Yes I do!” said Rich.
Rich slid his dip next to the dish.
“Chuck, do you want dip?” Rich asks.
“Yes I do!” said Chuck.
They chill and chat and munch on chips and dip.
Yum! Yum! Yum!`},{id:"49",title:"Snacks for the Pets",text:`Snacks for the Pets

Beth has a lot of pets. She has ten small chicks and six big sloths.
She grabs a big bag of snacks and drags it to the pet pens.
The ten small chicks run to Beth.
“Do you chicks want a snack?” Beth asks.
“Cluck, cluck, cluck,” go the chicks.
The chicks peck at their snacks.
Beth looks up in the tree at the sloths.
“Do you sloths want a snack?”
The sloths nod.
Beth hands the sloths their dish of snacks.
Munch, munch, munch go the sloths.
Beth grabs the last snack in the bag.
“I will have this snack,” Beth says.
Beth sits on the grass and snacks with the pets.`},{id:"50",title:"On a Whim",text:`On a Whim

Phil and Whit went on a walk.
On a whim, they went to see Steph.
She could whip them up a snack.
She was a whiz with a whisk.
“Which snack do you want to munch on?” said Steph.
Whit would want a big snack, but Phil would want a small snack.
“Let me have a whack at this dish,” said Steph.
She whips up a dish to munch on.
Phil and Whit got a whiff of the dish.
“Yum!” said Whit.
The pals were glad they went to see Steph on a whim!`},{id:"51",title:"King and Ash Sing",text:`King and Ash Sing

King and Ash are best pals.
To have fun, King and Ash sing songs.
King brings Ash a book of songs.
“Which song should we sing?” asks King.
“Let’s pick a quick song and then a long song,” said Ash.
King and Ash sing their songs.
King’s mom just got back from the shop.
“Will you sing me a song?” she asks.
“Yes!” yell Ash and King.
They grab the book of songs.
“We have to pick the best song for your mom,” said Ash.
King looks in the book. He sees the best song.
“This is it,” he says.
King and Ash sing.
King’s mom claps and says,
“I am so glad you sang that song.”`},{id:"52",title:"Stink in the Bank",text:`Stink in the Bank

Hank has a job at the bank.
When Hank gets to the bank, he sniffs a bad smell.
“What is that smell?” Hank thinks.
“Is it a skunk?”
He sniffs his desk. “No, it’s not my desk.”
He checks the fish tank. “No, this is not what stinks.”
He walks to the back of the bank.
When he gets to the back, he sees the small trash bin.
“Oh no!” Hank yells, “I left all the trash in the bin.”
Hank sniffs the trash. “Yuck!” he yells,
“that’s what stinks!”
Hank brings the trash to the big bin and slams the lid shut.
Hank is glad he got rid of the stink.`},{id:"53",title:"The Ship Dock",text:`The Ship Dock

Quin goes to the dock with Jax.
They sit on the dock and look at the ships.
Jax looks up and sees a big clock.
“What is that clock for?” he asks.
Quin says, “There is a bell in the clock.
When the bell rings, the ships can go to the dock.”
Quin and Jax look for ships that could go to the dock.
“I think that tall black ship will go to the dock,” said Quin.
“I think this big pink ship will go to the dock,” said Jax.
The bell rings. Ding dong. Ding dong.
Which ship will go to the dock?
The tall black ship goes past the dock.
The big pink ship goes past the dock.
“Look!” said Quin. Jax sees a small red ship.
The small red ship stops at the dock.
“We should have said the red ship!”`},{id:"54",title:"Cave in the Maze",text:`Cave in the Maze

Dale and Jade went into a maze to win a game.
The maze was long and full of snakes.
Dale said to Jade, “I can not go on.”
“Yes, you can. You are brave!” said Jade.
Dale and Jade walk and walk.
At last, they made a left and got to the end of the maze.
Then they see six small caves.
“Let’s go into the last cave,” said Jade.
In the back of the cave, they see a gate!
The gate is shut. How will they pass?
Dale shakes the gate. Jade kicks the gate.
The gate is still shut.
“Look!” yells Jade, “the gate has a lock.”
Dale twists the lock. Pop!
The gate swings in.
Dale and Jade win the game!`},{id:"55",title:"Kites for Sale",text:`Kites for Sale

Mike can ride his bike quite well.
Mike likes to ride his bike to sell kites.
Mike takes nine kites and a bit of twine.
He strings the kites to his bike with the twine.
As he rides, the kites go up, up, up.
You can see the kites for miles.
Mike stops by a red gate and lets the kites wave.
“Kites for sale!” he yells.
Kids run to his bike.
Mike sells his kites for a dime.
“Thank you, Mike!” yell the kids as they take their kites.`},{id:"56",title:"The Drive Home",text:`The Drive Home

Hope and Dad went to the lake for a swim.
They swam and swam.
“It’s time to go home, Hope,” Dad yelled.
As Dad drove home, Hope could see smoke!
“Dad there is smoke!” yells Hope.
“It is next to the phone shop.”
They drove fast to the phone shop.
When they got to the front of the shop, they froze.
The shop was on fire!
Dad calls 911.
“Yes, send the fire trucks!” Dad tells the man on the line.
While Dad is on the phone, Hope sees a man run out of the shop.
He is safe. The fire trucks came just in time to get rid of the flames.
Hope and Dad save the shop!`},{id:"57",title:"Five Mile Hike",text:`Five Mile Hike

Chan rides his skates to the lake.
When Chan gets to the lake, he looks for his pal Eve.
He sees Eve on the black dock.
“Want to hike?” asks Eve.
“Yep!” Chan says.
“OK. Grab these snacks for us to have on the hike,” says Eve.
Eve and Chan hike for a long time.
“This is a long hike!” says Chan.
“Yes. It is five miles,” says Eve.
Eve and Chan talk as they walk.
Eve tells Chan when they are close to the top.
“Here we are! The top of the hill!” Eve yells.
Eve and Chan can see for miles.
“Thank you for this grand hike,” says Chan with a wide smile.`},{id:"58",title:"June’s Flute",text:`June’s Flute

June has a flute.
June likes to use the flute to make tunes.
There is one tune June likes best.
She likes the song Sand Dunes.
June has a pal, Luke.
Luke has no flute, but Luke likes to sing.
Once, June and Luke made tunes at lunch for their pals.
The last song they did was Sand Dunes.
June was on the flute and Luke sang.
They did a fine job!`},{id:"59",title:"A Cake for Tess",text:`A Cake for Tess

Niles and Blake want to bake a cake for Tess.
Tess is their big sis.
She will be a bride, so they want to bake a white cake.
Niles and Blake mix the cake while Dad gets one pan.
The mix goes, Drip! Drip! into the pan.
They ask Dad for help with the stove.
The cake bakes for a long time.
Next the cake goes on a glass plate.
“The cake looks so cute. I want to take a bite!” says Niles.
“We can not take a bite. This cake is for Tess!” says Blake.`},{id:"60",title:"The Mice Can Race",text:`The Mice Can Race

“What is the price for the box of white mice?” Grace asks.
The man at the pet shop tells Grace they cost five bucks.
“I have five bucks! I would like to take these mice,” says Grace.
The man hands the box of mice to Grace.
Grace takes the mice home.
Grace makes a track for the white mice. She wants them to race.
Grace will place the mice on the track.
When Grace says “GO!” the mice race.
They run the track twice.
“These mice are so fast!” says Grace.`},{id:"61",title:"Pete’s Pet Snake",text:`Pete’s Pet Snake

Pete got a pet snake. Pete gave the snake a name.
“You are Steve,” Pete said to the snake.
Steve has a huge glass cage.
Pete has to lock the cage, so Steve is safe.
Steve likes his cage. He can hide next to the rocks.
He can rest in the sunshine or the shade.
At his age, Steve’s skin sheds and his scales change.
This looks a bit strange, but Pete likes Steve all the same.`},{id:"62",title:"June’s Bike Shop",text:`June’s Bike Shop

June sells bikes.
She will give you such a nice price you will not think twice.
Steve and Grace come to June’s shop to get bikes.
“I love this red one, it looks fast,” said Steve.
“I love this blue one, it looks fun,” said Grace.
“Can you give us a good price?” asks Grace.
“Done and done,” said June.
Steve and Grace smile and ride off with their bikes.`},{id:"63",title:"Two Foxes",text:`Two Foxes

Alex lives in a home close to the lake.
Two foxes live in a den next to him.
Alex likes to see the foxes in the bushes by their den.
Alex is nice to the foxes.
When Alex goes for walks, he brings boxes of snacks for the foxes.
Alex loves when the foxes munch on the snacks.
The foxes like Alex so much, they give him kisses.
Alex wishes he could see the foxes all the time.
But they like to spend lots of time in their den.`},{id:"64",title:"Will the Whale",text:`Will the Whale

Once upon a time there was a whale named Will.
Will lived with many whales in a pod.
Will loved his pod.
The pod splashed and jumped in the waves.
The pod drifted from place to place.
One time, Will and his pod of whales ended up in a cove.
The cove was filled with fish and shrimp.
The fish swam in the waves.
The shrimp drifted with the tide.
Will and his pod of whales flicked their fins to splash the fish.
The fish flicked their fins back at the whales.
The whales and the fish did not splash any of the shrimp.
And the shrimp did not splash any of the whales or the fish.
The whales and the fish had fun while the shrimp just drifted.`},{id:"65",title:"We Love Camp",text:`We Love Camp

Going to camp is so much fun.
We all get to spend time doing things we love.
Chance is fishing at the pond.
Ming and Beth are boxing in the ring.
Sage is resting in the tent.
Jace and Tess are acting on the stage.
Len is looking for bugs in the grass.
We will be sad when camp ends.
We love spending time at camp!`},{id:"66",title:"Jo’s Friend Russ",text:`Jo’s Friend Russ

Jo has a best friend named Russ.
Russ and Jo go on bike rides in the fall.
In the spring, they swim in the lake.
At the lake, Jo brings snacks and Russ brings drinks.
They also love acting, singing, and telling jokes.
Russ likes spending time with Jo and Jo likes spending time with Russ.
Russ and Jo will be friends for a long time.`},{id:"67a",title:"Mo and the Sandbox",text:`Mo and the Sandbox

Mo was at home with his grandmom.
Mo sat in his sandbox while grandmom swept the tile.
When grandmom was done with the tile she yelled to Mo, “bath time!”
Mo did not want to take a bath. He still wanted to sit in his sandbox.
“Mo, you must get in the bathtub because you are full of sand,” said grandmom.
“OK, fine,” said Mo. He picked up his stuff from the sandbox and got in the bathtub.
When Mo was done with his bath he sat with grandmom.
“Can I tell you something, grandmom? The bath was not so bad.
It got rid of all the sand just like you said.”
Grandmom gave Mo a big hug and a kiss.`},{id:"67b",title:"The Rocket Contest",text:`The Rocket Contest

Denzel and Edwin dash to the rocket contest.
The man at the gate says “Get your tickets, get your tickets!
You do not want to miss the big rocket contest.
Which rocket will be the fastest and win the prize basket?”
Denzel and Edwin get to the contest just in time.
They grab their blankets and look for a nice spot to sit.
They are all set to see the rockets go!
They see the blue rocket take off, then red, then pink, then white.
They go up, up, up, so fast.
Which is the fastest? The blue rocket wins!`},{id:"68",title:"Music Class",text:`Music Class

Music class is the best because we get to sing.
It is no secret that I love to sing.
If you sing well, you get to have a solo.
When I have a solo in music class, I pretend I am on a huge stage.
It is silent for a moment, then I begin.
I sing and sing like time is frozen.
At the end, my friends clap for me.
That is a nice bonus.`},{id:"69",title:"Catching Fish",text:`Catching Fish

Kate and Mitch wanted to do something fun.
Kate hatched a thrilling plan. She snatched a bucket and some poles from the hutch.
“Let’s go!” Kate yelled. Kate and Mitch went to the lake beyond the ditch.
“Let’s catch some fish,” Kate calls out.
Mitch catches a fish! They pitch it in the bucket.
“Nice catch! Let’s get this fish back home,” said Kate.
At home, Kate and Mitch toss the fish into their pond.
“This fish can be our pet!” said Kate.`},{id:"70",title:"The Lodge",text:`The Lodge

Calvin has a lodge at the edge of the glen.
The lodge has a fridge and a TV.
To get to the lodge, you must go on a bridge then pass the ridge by the lake.
You can see many animals move from place to place by the lake.
Calvin loves the lodge. He pledges he will not move from it because his children come to visit him there.
Calvin and his children have lots of fun at the lodge.
They make music and sing songs by the fire.
Sometimes they even jump into the lake and swim with the animals.
The lodge is a hidden gem.`},{id:"71",title:"Robin and Butch",text:`Robin and Butch

Robin is walking Butch the bulldog.
They walk to a patch of grass beside a big ditch.
Robin tosses a stick and Butch dashes to fetch it.
The stick lands on the edge of the ditch.
“Oh no! That is a bad place for the stick to land,” thinks Robin.
“Stop Butch!” she yells. Butch stops and does not budge.
Robin walks up to the edge and grabs the stick.
“Good job Butch! I got your stick. Do you want it back?”
Robin tosses the stick and Butch jumps to catch it.`},{id:"72",title:"The Gold Rush",text:`The Gold Rush

Long ago, bold men and women drove west to find gold.
They left their old lives behind in hopes of being rich.
These were wild times. Mines exploded with gold that could be sold for lots of cash.
Some folks got rich, but most did not find any gold.
The men and women who did not find gold went back to their old homes.
There they told the tale of their tragic time in the Wild West gold rush.`},{id:"73",title:"Plane Race",text:`Plane Race

Tyrell and Franklin love planes. They love to see them fly in the sky.
Once, Tyrell and Franklin went to see four planes race.
There was a red plane, a white plane, a pink plane, and a black plane.
“I bet the red plane will win!” said Tyrell.
“I think the white one will win!” said Franklin.
Tyrell and Franklin spy the planes as they fly by in the sky.
In the end, the black plane made it to the finish line.
“Oh well! The red and white planes can try to win next time,” said Tyrell.`},{id:"74",title:"Lily’s Puppy",text:`Lily’s Puppy

Lily had been wishing for a puppy for a long time.
She wanted a silly puppy to run and jump with.
But her mommy said Lily could not have one because she was only seven.
Lily begged her mommy and daddy.
She said, “I am not a baby. It would make me so happy to have a puppy.”
Lily’s mommy and daddy talked for a long time.
They said, “We do think you will try your best. We will let you have a puppy.”
Lily was so happy. She went to the pet shop and picked a tiny puppy.
She named him Cody. Cody is the best puppy for this family.`},{id:"75",title:"Maple Fudge",text:`Maple Fudge

Uncle Billy wanted to take Able to the candy shop.
They drove to a lot and jumped on a shuttle to the shop.
When they walked into the candy shop, they smelled the fudge on the table.
Able wanted a sample of the maple fudge. He hoped it would not be a hassle for the woman behind the table.
“Can I have a sample?” asked Able.
“Yes, you can! Which would you like to sample?” said the woman.
Able, with a giggle, asked for the maple fudge.
“You picked the best one to sample!” said the woman.
Able nibbled on the fudge. “This is so yummy!” he said while licking his lips.
Uncle Billy got a little bag of fudge for Able to take back home.`},{id:"76",title:"A Trip to the Jungle",text:`A Trip to the Jungle

Salma and Felix are going on a trip to the jungle.
They packed their duffle bags and got on a plane to Brazil.
Once in Brazil, they rode a shuttle to the jungle.
In the jungle, they saw an anaconda in the grass. They also saw a chimp dangle from a vine.
At the end of their trip, they got to see the king of the jungle, the lion!
The lion looked hungry and dashed to find a yummy snack.
“I am so happy we got to see these animals,” said Salma.
“Me too!” said Felix.`},{id:"77",title:"The Garden",text:`The Garden

Omar loves to be in his garden on his farm. While it is still dark, he drags his old cart across the yard to the barn.
He fills the cart with plants for the garden.
When he gets to the garden, he looks at the plants one by one.
Then he finds them all the best place to live.
He finds big spaces for the large plants.
He finds shade for the plants that do not like the harsh sun.
He gives them all just what they want and makes them look so pretty.
When Omar is done, he brings the cart back to the barn.
Then he sits on his deck and looks at his garden with pride.`},{id:"78",title:"Marvel at the Shore",text:`Marvel at the Shore

Cory and his horse, North, traveled to the shore.
Cory held on to North’s mane as North galloped across the sand.
They arrived at the shore before anyone else.
There had been a storm at sunset, so this morning the shore was a marvel.
There were hundreds of starfish along the shoreline.
The starfish got pulled to the shore in the storm.
They were so pretty, but if they were left on the shore they would dry up.
Cory jumped off North’s back. He picked up starfish one by one and placed them back where they came from.
Cory was happy he could transport the starfish back home.`},{id:"79",title:"Trip to the Market",text:`Trip to the Market

Mom and Marcus went to the market.
They wanted to pick up some pork, corn, rice, and a jar of mango jelly.
They liked this market more than the large store with all the people.
The market was on a farm.
Mom parked the car and Marcus got the cart.
This would be a short trip since they only wanted four things.
Marcus got the rice and jar of mango jelly.
Mom picked up the pork and corn.
Once they had all their items, they gave the saleswoman their cash.
Then, they departed the market. They got back in their car and drove home for a yummy lunch.`},{id:"80",title:"My Sister’s Fern",text:`My Sister’s Fern

My sister adores plants. She wants to be a farmer or a gardener when she gets older.
She has a number of plants at home, but the plant she loves the most is a fern.
She has five different kinds of ferns in her backyard.
When the ferns are on the verge of wilting, she uses her mister to get them wet.
After that, they perk back up.
If it is too hot, she gives the ferns some shade on the porch.
My sister thinks there is nothing more pretty than a fern!`},{id:"81",title:"A Turtle can Surf!",text:`A Turtle can Surf!

Irma the turtle loved to surf. Her mother, Shirly, was the first girl surfer in their turtle village, and Irma wanted to be just like her.
Every morning Irma would rush to the shoreline.
When she was surfing, Irma would do flips and turns. She would twirl like a twister.
All the other animals were shocked that a girl turtle could surf so well!
Irma would just yell, “A girl can do anything!” just like her mother told her.
Irma would surf until sunset.
When the sun was no longer in the sky, she would skip back home.
Once she was home, she would curl up in her turtle bed and relax.`},{id:"82",title:"The Worst Pet Ever",text:`The Worst Pet Ever

Morgan has wanted a pet for a long time. One morning, there was a small box on the table with her name on it.
Inside the box, there was a bunch of dirt. Under the dirt was her new pet, a worm!
Morgan was sad. She thinks a worm is the worst pet in the world.
She wanted a dog or cat or even a hamster, not a squirmy worm!
What were her mom and dad thinking? This pet will not work. She started to cry.
Just then, mom and dad came in and said, “We got you! It was a joke! We are going to the pet shop!”
Morgan was so happy. She wiped her face and gave mom and dad a hug.
She was going to get the best pet ever!`},{id:"83",title:"Fishing at the Port",text:`Fishing at the Port

Travis and his father wanted to go fishing at the port.
They drove to the tackle store to pick up some items.
They had to get some fishing line and a jar of worms.
Travis found the jar of worms under a large rack of fishing poles.
His father found the fishing line.
He picked the extra sturdy line so they could catch big fish.
They gave the clerk a credit card for their items.
Travis and his father left the tackle store, got in the car, and drove north to the water.
This would be their third trip to the port.
Last time, they went home with five fish.
This time, they hope to catch more.`},{id:"84",title:"Sunday Fun",text:`Sunday Fun

On Sundays, Gail visits her brother at his farm.
Gail loves to go to the farm because there is so much to do.
She starts the day in the garden. If it did not rain, she sprays the plants with water.
Then, Gail and her brother walk on the trail from the garden to the pond.
As they walk, Gail hunts for snail shells.
When she finds shells, she tucks them in her pocket. She will paint them when she gets home.
At the pond, her brother likes to fish.
He strings bait onto his fishing pole and waits for a bite.
While they wait, Gail plays in the mud and clay.
At the end of the day, they walk back up the trail to go home.
As they walk, they see the sun set and the day fade away.`},{id:"85",title:"Deep in the Green Forest",text:`Deep in the Green Forest

Once upon a time, there was a fox who lived in a valley.
She spent her days deep in the green forest.
Each day, she would wake up from her sleep and greet the forest animals.
She would say hello to the animals in the trees above her.
She would also say hello to the animals who rested by the stream.
One morning, the peace of the forest was broken by a horrid scream!
The fox looked up to see where the scream came from.
She saw a fallen tree. She peeked in and came upon a monkey.
The monkey was stuck in the fallen tree. “Can you please help me get free?” pleaded the monkey.
“I will try my best,” the fox said.
The fox pushed very hard and in the end the monkey was freed!
“Thank you so much,” the monkey said as he leaped into another tree.
As the fox walked back to the valley, she beamed with pride for helping the monkey.`},{id:"86",title:"A Trip to the Coast",text:`A Trip to the Coast

Harvey owns a big yellow boat. Every summer, he takes the boat on a trip to the coast.
This time, he wants to bring his friends, Layla and Joe, with him.
There is just one problem, Layla can not swim! Layla must be able to swim if she wants to go on the boat.
Layla started swim lessons to grow her skills. She even got a swim coach to teach her.
She started slow, but Joe helped her get better.
After four weeks of lessons, Layla could swim!
Now she could paddle, kick, and float all by herself.
Layla showed Harvey her skills. Harvey was thrilled!
The next day, Harvey and Layla and Joe set sail to the coast.`},{id:"87",title:"The Right Job",text:`The Right Job

Illustrate the story here:
Curt is a pilot. This means he must fly planes for work.
He sports a white shirt and a necktie when he is on the plane.
He has been flying for a long time.
Sometimes Curt must fly at night when there is no light in the sky.
At night, everyone on the plane is asleep and it is silent.
This is peaceful, but sometimes it gets boring.
Curt prefers to fly in the daylight.
This is when he can see the land below and talk to people.
Curt also likes seeing the sights in the places he goes.
He delights in exploring the parks, theaters, and stores wherever his flights take him.
But what he likes best is being high up in the sky.
Being a pilot is the right job for Curt!
(Note: The text says "Illustrate the story here," but we have omitted everything except the reading exercise itself.)`},{id:"88",title:"Aiden’s Goal",text:`Aiden’s Goal

Aiden had to find a way to make money. He needed to save up for his dream car.
He wanted to get a jeep, but jeeps are not cheap.
He needed to find a job that paid very well, so he could own his dream car.
What could he do?
Aiden went to his father for advice. His father said he should study.
“How will studying get me my dream car?” Aiden asked.
His father explained that he could study a trade like welding or carpentry.
He could also take more classes to get a degree.
People who had a trade or a degree could make a lot of money.
Aiden needed to think over what his father had told him.
It would take longer to study, but in the end, Aiden would be able to get his dream car and more.
After days of thinking, Aiden chose to take more classes.
This would help him reach this goal and his next one, whatever that might be.
Aiden’s father was almost always right.`},{id:"89",title:"Brooklyn’s Reading Nook",text:`Brooklyn’s Reading Nook

Brooklyn got a new book. For weeks, Brooklyn had been looking for this book in every bookshop.
She put it at the top of her list because she was confident that this story would be a good one.
Brooklyn loved her reading time on the weekends.
Each Saturday, she was able to sit in her reading nook and dive into a good book.
Last weekend, she finished a story of a famed football star.
This weekend she would be starting Little Red Riding Hood.
But this story is not the classic she remembers from her childhood.
In that book, Little Red Riding Hood is a small child.
This modern story is a twisted tale.
Little Red Riding Hood is a grown-up when she goes for a walk in the woods.
Brooklyn could not wait to pull on her cozy hooded blanket and curl up in her nook with her book.`},{id:"90",title:"The Groom is Late!",text:`The Groom is Late!

The flustered groom rushed into the church. He was very late.
Not only was he late, but he had not even finished dressing.
He was still pulling on his boots.
He ran to his best man and said, “I slept in! My alarm did not go off!”
“Keep your cool! Better late than never,” said the best man.
The groom smoothed his shirt as best as he could and finished pulling on his boots.
“All set!” said the groom. “Time to see my bride.”
Just then, booming music started to play, and the church doors swung open.
The bride was so graceful as she entered the room, she seemed to be floating.
As she reached the groom, she whispered, “Better late than never.”
The groom blushed and said, “my alarm did not go off!”
With a smile, the bride took her groom’s hand and said,
“Next time I will put the alarm on for you.”`},{id:"91",title:"Cruise Ship Trip",text:`Cruise Ship Trip

Drew and Marley were thrilled as they walked onto their first cruise ship.
They had been packing for this trip for months.
Their suitcases were so full they almost did not close.
When they got to their cabin, they looked out their window and saw the vast blue sea. It was very pretty!
They left their suitcases in the cabin and went to grab a bite to eat by the pool.
Yes, the new cruise ship had a pool! How cool!
Drew drank apple juice while Marley chewed on some fruit.
They watched the crew greeting everyone as they came onto the ship.
“This is going to be a fantastic trip!” said Marley.
“Yes, I think when we get back on Tuesday, I will feel relaxed and renewed!” Drew said as the ship’s horn blew.
Honk! Honk!
“And off we go!” Marley squealed. It was a dream come true.`},{id:"92",title:"Classroom Clean Up",text:`Classroom Clean Up

Miss Booker had so many things to do. Classes would be starting next week.
She wanted the classroom to be perfect for the children’s first day!
On Tuesday, she needed to clean the floors and closets.
They were filled with dust and grime from the summer months.
On Thursday, she would need to unpack all the boxes.
The boxes contained her books, games, and puzzles.
On Friday, she would decorate the door and create a display in the hallway.
She also wanted to put up a new welcome banner.
Then on the weekend, she was going to plan the cool games and projects they would do during their first week.
Miss Booker was so excited for her new class!`},{id:"93",title:"Trip to the Zoo",text:`Trip to the Zoo

Audrey and Willow could not wait to see all the animals at the zoo.
As they reached the entrance, Audrey paused and asked, “did you bring the tickets?”
“Yes! I have them right here,” said Willow.
The first display they visited was full of birds. “Look at that pretty macaw! Its wings are like a rainbow,” exclaimed Audrey.
“I see the macaw,” responded Willow, “but look at this hawk! It caught a fish in its claws.”
Willow could have spent hours at the bird display, but Audrey said she wanted to see more animals.
The next display contained a lion sleeping on a large lawn.
The lion woke up for five minutes, but then yawned and fell back asleep.
“He seems to have day and night mixed up,” snickered Audrey.
“Well, it’s not his fault. If I had to hunt for my food, I would want a nap too,” Willow commented.
Audrey smirked and said, “That reminds me, I am hungry.
Can we go hunt for some food at the snack stand?”`},{id:"94",title:"Surprise on the Track",text:`Surprise on the Track

“Ready, set, go!” yelled the track coach.
The first race of the fourth-grade track meet had begun.
Heather had been waiting for this track meet for months. She was ready to win.
At first, Heather took the lead. But, as she sprinted to the finish line,
she saw some other fourth graders catching up to her.
She did not want to give up her lead.
She worked on keeping her breath steady as she ran and leaped over the hurdles.
Heather was almost to the finish line when, all of a sudden, she saw something white wander onto the track.
“A swan!” yelled a child in the stands.
A swan wandered onto the track from the swamp up the road.
The swan began to waddle to the finish line.
Heather crossed the finish line at the same exact time as the swan.
“So, who won the race?” asked the class.
“It’s a tie! Heather and the swan both won!” exclaimed the track coach.`},{id:"95",title:"The Right Choice",text:`The Right Choice

In February, Boyd and James had a choice to make.
Their mother said they could get a new pet, but they had to agree on which pet to get.
As the boys entered the pet store, their mother’s voice rang in their heads.
“Boys, you need to pick a pet that is cute, sweet, and spirited.”
The boys looked at all the choices of pets.
Boyd saw a small kitten. “This kitten is cute,” said Boyd.
James pointed to a spunky puppy. “This puppy looks sweet,” said James.
Crash! Just then, the boys heard a big noise.
They turned to see a bin of dog toys spilled on the floor.
Right in the middle of this mess was a tiny yellow bird.
The bird must have gotten free from its cage and flew into the bin.
When the yellow bird saw the boys, she joined them and sat in Boyd’s hands.
“I think we have our new pet,” Boyd said.
“Yes, she is cute, sweet, and spirited,” said James.
“And she made the choice for us!”`},{id:"96",title:"Summer at the Farmhouse",text:`Summer at the Farmhouse

Joey is staying with his grandmother for the summer.
His grandmother owns a farmhouse close to town.
Joey likes to help his grandmother around the farm.
However, he most enjoys watching the animals who live outdoors.
On Monday, he saw a brown owl hunting a small mouse.
The mouse found its way back underground just before the owl swooped down.
On Wednesday, he walked down to the stream south of the farm.
This stream is full of trout and Joey likes to watch them swim.
Then on Friday, he went to the meadow where the cows graze.
He picked some wildflowers for his grandmother.
Joey hopes to return to his grandmother’s farmhouse each summer.`},{id:"97",title:"A New Coin",text:`A New Coin

While walking home from work, Carson saw a coin laying on the ground.
“This is my lucky day! I found a coin,” said Carson.
But as Carson inspected the coin, he began to notice that he had never seen a coin quite like this before.
This coin had a hole in the middle of it, and Carson did not recognize the markings on it.
Carson wanted to find out where this coin came from.
When he got home, he went online to see what he could find out.
He looked for any coins with holes in the middle.
He found that there are several kinds of these coins around the world.
Japan, Norway, and Spain all have coins with holes in the middle.
However, as Carson looked at the coins on his computer screen in more detail,
he found one that was an exact match.
He ran into the family room and shouted to his father and sister,
“My newfound coin is from Japan! Japanese coins are called yen. Who could have lost it?”
Carson’s father considered for a minute, and then said,
“I remember the mailman telling me he had taken a trip to Japan last month.
It could be his. I will ask him on Wednesday!”`},{id:"98",title:"Birdwatching",text:`Birdwatching

With her notebook in hand, Cassie walked into the forest ready to study some birds.
She loved birdwatching, and she had a knack for finding birds in new places.
As she walked, she wrote down the names of the different birds she saw.
She would even sketch a drawing of each bird in her notebook.
About one hour into her hike, Cassie knelt to rest and eat a snack.
As she ate, large crumbs fell to the ground.
Snap! Cassie heard a noise very close to her.
When she turned around, she saw a small brown bird pecking at her leftover crumbs.
It was a wren! Cassie had never seen a wren in real life, but she knows about them from reading her books.
Cassie knows that wrens have short wings and hold their tails upright.
Wrens are also known for singing loud, complex songs.
This little wren seemed to love Cassie’s snack.
When all the crumbs were gone, the wren lifted its wings.
Cassie watched it fly away into the forest.
Cassie was so thrilled with her wren sighting that she sang a long tune all the way home.`},{id:"99",title:"Trip to the Baseball Park",text:`Trip to the Baseball Park

The boys and girls of Miss Brown’s third grade class are jumping up and down with delight when the buses pull up in front of them.
All the third grade classes are going on a trip to see a baseball game today.
After the teachers check who is present, the students and teachers make their way onto the buses and sit down.
As they drive to the baseball park, the students look out the windows and sing silly songs.
Once inside the park, they look at the numbers on the benches to find their seats.
The game starts a few minutes later.
The students cheer as they watch the home team score the first points.
The home team makes some impressive runs, passes, and pitches.
As the game is about to end, the classes scream with joy.
They see themselves on the big screen!
On the ride back home, the students and teachers talk about the thrilling events of the day.
They all agree they should take a trip to the baseball park again soon.`},{id:"100",title:"Growth Spurt",text:`Growth Spurt

Akeem woke up one morning feeling quite strange.
His arms stretched longer than they ever have before.
When he stood up, he hit his head on a shelf!
He felt like he had a brand new body.
When Akeem got dressed, none of his clothes fit.
His arms were longer than his shirt sleeves.
His shoes were smaller than his feet.
Even his longest pants were now too short.
What was he going to do?
Akeem walked into the kitchen with his too big body in his too small outfit.
“Wow,” grandma exclaimed, “you had a growth spurt! You got taller overnight!
Now you may be the tallest kid in your class!”
Akeem’s big brother got up from the table and stood next to him.
The top of Akeem’s head only reached his brother’s elbows.
“Well, you’re still shorter than me,” he said with a grin.`},{id:"101",title:"Rollercoaster",text:`Rollercoaster

When Kenzer and Sidney got to the front of the line, they finally saw the cars rushing past them. Up close, they seemed a lot faster.
As the kids sat in their seats, they double checked that their seatbelts were firmly locked in.
Then, they breathed deeply and closed their eyes.
The rollercoaster inched up the tracks so slowly it hardly felt like they were moving.
When it got to the top, Kenzer timidly peered over the edge.
Just when it felt like they got stuck, the car fell quickly. Instantly, they screamed loudly.
Kenzer’s belly was doing backflips. Sidney’s curls were blowing in the wind.
Their arms and legs were flailing in the sky.
Then, just as quickly as the ride started, it was finished.
They sat silently for a moment, hardly understanding what just happened.
As Kenzer and Sidney took off their seatbelts, they looked at each other and yelled, “that was awesome!”
Then they got back in line to take another ride on the rollercoaster.`},{id:"102",title:"A Dreadful, Stormy Day",text:`A Dreadful, Stormy Day

Today Hailey was feeling restless. She wanted so badly to go outside and play but there was a huge storm.
The wind was blowing powerfully, and the rain was extremely heavy.
It was not safe for Hailey to go outside.
She was clueless about how to have fun inside and started to become hopeless.
As she was searching her room for something to play with, she found an old box hidden deep under her bed.
She assumed it was full of useless junk, but when she opened it, she found one of her old games.
Hailey lost the game a long time ago and was thankful to find it.
At last, she was feeling hopeful. She showed the game to her sister, and they played for countless hours.
It was delightful. They didn’t even realize the storm had passed.
What Hailey assumed would be a pointless day turned out to be delightful!`},{id:"103",title:"Unlucky",text:`Unlucky

Something very unlucky happened to Lee last week.
As he was walking into his classroom, he did not see the puddle on the floor.
He slid and fell in front of his entire class.
That’s not even the worst part! Lee was holding a jar of marbles with the lid unscrewed.
When he fell, the marbles flew everywhere.
Lee laid on the floor, covered his face, and wanted to cry.
But then, all of a sudden, his best friend, Jayvon, sat down next to him.
Jayvon uncovered Lee’s face and helped him up.
“Don’t worry,” Jayvon said, “people fall all the time.”
At first, Lee felt uneasy. When he looked around at his classmates, nobody made fun of him for falling.
Instead, Lee’s classmates began picking up all the marbles that spilled.
Some of them even told him about times when mistakes like this happened to them.
It turns out, it is not that unusual to slip and fall.
“I am thankful to have such nice friends,” Lee said.`},{id:"104",title:"Dinner at Grandma’s",text:`Dinner at Grandma’s

Every Sunday David and Alexis go to Grandma’s house for dinner.
This Sunday, they got to help Grandma cook.
“Here, put these aprons on,” Grandma said as she greeted the kids at the door.
David and Alexis helped each other untie and retie the aprons so they fit just right.
“First, we must preheat the oven,” said Grandma. “Next, we wash the potatoes and use a knife to remove the skin.
David, that can be your job.” David began cutting the potatoes.
“Now we need to boil some water. Alexis, this will be your job.
Dump this cup of water into the pot then refill it and add more until the pot is full.”
Alexis began filling the pot.
“Grandma, this potato still has a bit of skin. Should I redo it?” asked David.
“No, that is perfect,” Grandma responded.
As the kids cooked, they retold jokes their friends told them and showed Grandma a preview of the new show they were watching.
When the meal was ready, David and Alexis sat down to eat.
Grandma got a cake from the fridge and placed it on the table.
“I premade this as a surprise for dessert!” she said.
David and Alexis can’t wait to return to Grandma’s next week to cook some more.`},{id:"105",title:"Poppy the Gamer",text:`Poppy the Gamer

Poppy enjoys playing video games. She is so talented that she plays in events against other gamers and wins quite a bit.
The only problem is that her video game console is old.
She needs a replacement. Her mom disagrees. Mom thinks the old console works just fine.
“You don’t understand,” explained Poppy, “it is so old that it will disqualify me from playing in some events.
I am at a huge disadvantage with this console.” Mom understood, but the truth was that a new console was just too expensive.
Poppy was so disappointed.
A few weeks later, Mom had a surprise for Poppy.
“What is this?” Poppy asked, looking at a big bag.
“Open it and find out,” said Mom with a smirk.
It was the new console! And a brand-new game.
“It was on sale,” Mom explained.
“At the discounted price, we could afford it.
Plus, I told the clerk that you compete, so he threw in this new game for free.”
Poppy was elated. She gave mom a huge hug and rushed up to her room with the bag.
She disconnected her old console and connected the new one.
It was amazing! The graphics were so much better, and the new game was more of a challenge.
Poppy now had everything she needed to compete with the best players around.`},{id:"106",title:"Words Matter",text:`Words Matter

It is important to remember that words matter.
The words we say can impact how we feel and how we make other people feel.
Kind words are powerful. We are more likely to get what we need when we ask nicely.
We can also use kind words to express our feelings and share what we are thankful for.
Think of a time someone gave you a compliment.
It probably made you feel cheerful.
Unkind words are powerful too. They can be deeply painful and disrespectful.
Has anyone ever said something unkind to you? It probably made you feel dreadful.
Nobody is flawless, we all make mistakes.
If we say something hurtful, we can stop, reflect, and retry.
Hopefully, we can all think deeply about the words we say to make everyone’s day a bit more delightful.`},{id:"107",title:"The Busy Day",text:`The Busy Day

When Edwin got home from work, he dropped his bag on the floor and plopped on the couch.
“What a busy day I had,” he sighed. “I am exhausted.”
Edwin’s roommate walked in. “What made your day so busy?” he asked.
Edwin explained.
“It started this morning when I dropped off some letters at the post office.
The line was so long that I ended up running late for work.
Then, at work, I had so many meetings. It felt like they were never going to end.
I planned to come home for lunch, but I was so busy I skipped that trip.
I grabbed a sandwich and a drink from the diner on the corner.
As I was jogging back to the office, I tripped and dropped my drink.
But I was too busy to go back and get a new one.
When my day was finally over, I hopped in my car and drove home.”
“What are you planning to do this evening?” Edwin’s roommate asked.
“Nothing!” Edwin responded, “I will be sitting right here on this couch, resting.”`},{id:"108",title:"The Hottest Day",text:`The Hottest Day

One August day, Tyler went outside to play tag with his friends.
The sun was high in the sky. It felt like the hottest day of the year.
As Tyler was running around, his face got redder and redder and he felt hotter and hotter.
“It’s too hot outside to play tag,” Tyler called to his friends, “let’s go swimming instead.”
Tyler and his friends hopped on their bikes and rode to the pool.
At the pool, they had a contest to see who could make the biggest splash in the water.
Tyler made a pretty big splash, but his friends made bigger ones.
The friends had lots of fun at the pool.
The saddest part of the day was when they had to stop playing and go back home.`},{id:"109",title:"The Baker",text:`The Baker

Rashawn is a world class baker. He has been baking since he was a little boy.
Every day you can find him dancing around the kitchen while making yummy treats.
He also loves trading tips with other bakers about how to make their dishes even better.
One day, Rashawn’s friend, Payton, came over to visit.
Payton was hoping to taste some of Rashawn’s newest treats.
“You’re right on time!” Rashawn called. “I was just taking a fresh pie out of the oven.”
He cut two slices of pie and handed the larger slice to Payton.
“I am sure you’re going to love it,” Rashawn said smiling.
“Yuck!” Payton yelled as she tasted the pie.
“What do you mean, yuck?” asked Rashawn, his smile fading, “You don’t like it?”
“Just joking!” Payton said with a grin. “This is the best pie I have ever tasted!”
“Oh good,” Rashawn sighed as he sliced the rest of the pie up.
“But next time, it would be nicer to say you liked it from the start.”`},{id:"110",title:"Puppies",text:`Puppies

Violet loves helping animals.
Her favorite animals to look after are puppies.
Violet thinks puppies are the best because they are so cute and cuddly.
The way they run around and play always makes her laugh.
But looking after puppies isn’t always easy.
Puppies need a lot of help. The tiniest puppies need to be fed constantly.
It seems like their little bellies are never full.
When a puppy cries, Violet tries her best to find out what they need.
When the puppies need a bath, Violet scrubs them clean then dries them off.
When the puppies are sleepy, Violet lays them on the fluffiest blankets for a nap.
When the puppies need to go potty, Violet hurries to get them outside before they make a mess.
Most of the time, the puppies just want their tummies rubbed, which Violet is perfectly happy to do for them.`},{id:"111",title:"A Pet Lizard",text:`A Pet Lizard

Have you ever considered getting a pet lizard?
They may seem like an unusual choice, but they can be lovely pets.
Lizards are reptiles. They can be big or small and many different colors.
You can create a nice habitat for your lizard to live in.
Start with a big cage so your lizard has room to roam.
You will also need some food for your lizard.
Lizards eat bugs and worms and plants. Some even like to eat flowers.
Perhaps they like the flavor of the nectar inside the flowers.
Unlike dogs and cats, lizards do not need collars and do not need to be taken on walks.
Just remember, if they ever get sick, take them to a doctor who can help them get better.
So, what do you think? Would you want to have a pet lizard?`},{id:"112",title:"A New Pair of Pants",text:`A New Pair of Pants

Clare went shopping for a new pair of pants.
After going to five stores, she could not find the pair she wanted.
Then, at the sixth store, she found them.
The pair she picked flared out at the bottom.
They were light as air and so comfortable.
When she put them on, she stared at herself in the mirror.
Clare felt so fantastic in these pants that she twirled around and tossed her hair.
She wanted to purchase two pairs so she would have a spare pair to wear.
She brought the pants to the checkout counter.
“Those are nice pairs of pants,” said the clerk,
“if you take good care of them, they will last forever.”
“Thank you,” answered Clare with a big smile, “I sure will.”`},{id:"113",title:"The Yearly Strawberry Festival",text:`The Yearly Strawberry Festival

Did you hear? The Strawberry Festival is nearly here!
Toward the beginning of each year, our town hosts this event to honor the strawberry farmers.
It is always a blast to attend. You can eat all the yummiest strawberry treats including ice cream, cake, cookies, and milkshakes.
There are also rides and games. The most interesting game is hosted by the man with the long beard.
He will guess your birthday. Somehow, he is always right, but nobody knows how he does it.
There is also a person who does amazing card tricks.
If you give them a card, they will make it disappear!
What if the weather is bad, you ask? Never fear!
Even on a dreary day, there is fun to be had under the big tent.
Music, dancing, and crafts are sure to delight.
There are also clowns and comics to give you a good laugh.
Remember, the Strawberry Festival is only in town once a year.
Get your tickets now so you do not miss out on the fun!`},{id:"114",title:"Greyson’s Neighborhood",text:`Greyson’s Neighborhood

Greyson lives in a beige house on the corner of Eighth Street and Great Lake Road.
He has lived there for eighteen years.
Greyson loves his neighborhood because he has great neighbors.
Any time he passes someone on his street they always wave and say hey.
Greyson’s next-door neighbor is Stewart. Stewart loves to cook and has a huge grill in his backyard.
Every Friday, Stewart hosts a dinner party for Greyson and some other neighbors.
Last Friday, Stewart grilled steak and corn. It was quite tasty!
Greyson’s neighbors across the street are Cosmo and Wanda.
They have three dogs, four cats, and one fish. That’s eight pets!
Sometimes, Greyson walks the dogs for Cosmo and Wanda if they need a break.
When Greyson walks the dogs, they always go straight to the park to play fetch.
Greyson loves his beige house, his nice neighborhood, and his friendly neighbors.
He thinks he just might stay there for another eighteen years.`},{id:"115",title:"It’s No Fun to Argue",text:`It’s No Fun to Argue

Corey lives down the street from his nephew, Louis. They love to spend time together.
Corey calls Louis the best nephew on earth and Louis calls Corey the best uncle on earth.
Last Saturday, Corey took Louis to the park to play. Louis played a new game with a group of his friends.
The game was going well, but then a few of the kids started to argue about the rules.
The game could not continue while the kids were arguing. This made the rest of the group angry.
After a few minutes, Corey came to the rescue.
He said, “if you all continue to argue, you will not have any time left to play.”
This made everyone stop and think. The kids agreed that they wanted to spend their time playing instead of arguing.
“See,” Louis yelled, “this is why Corey is the best uncle on earth!”`},{id:"116",title:"The Dough Guy",text:`The Dough Guy

Stanley was preparing dinner one night when he thought to himself, “I would love to learn how to make fresh bread.”
He looked down at the loaf of crusty bread he bought from the store.
“I bet I can make better bread than this.”
The next morning, Stanley went to the store.
He wanted to buy all the ingredients to make fresh bread.
He needed flour and yeast to make the dough.
He picked those up and brought his basket to the counter.
“Are you making bread?” asked the guy behind the counter.
“Well, I’m going to try,” replied Stanley, although he still wasn’t quite sure what he was doing.
“You ought to buy a few more supplies,” said the guy. “Wait here.”
A few minutes later, the guy returned with salt, oil and a few different seasonings.
“This is what you need.” he said, “I also wrote down some tips to make your dough rise perfectly.”
“Wow!” replied Stanley, “that is so kind, thank you.”
“No problem,” said the guy, “I love making bread. Everyone calls me Dough Guy.
If your bread turns out well, would you bring back a slice for me to try?”
“I’ll bring you a whole loaf!” chuckled Stanley. “Thanks, Dough Guy!”`},{id:"117",title:"A Trip to the City",text:`A Trip to the City

Reginald took a train trip to New York City to visit his Uncle Quincy.
When he arrived, Uncle Quincy was there to greet him at the station.
“Welcome!” called Uncle Quincy with glee, “I am so excited to have you as my guest for the week.
I can’t wait to be your city guide.”
“I’m excited too!” replied Reginald, “I have been imagining this trip for a long time.”
Their first excursion was to a fancy ice cream parlor.
Reginald got a giant scoop of cinnamon ice cream. “This is incredible,” exclaimed Reginald between bites.
Next, the pair walked back to Uncle Quincy’s apartment.
When they got there, they saw a letter taped to the door. It was marked urgent.
“I wonder what that could be,” said Uncle Quincy with a sly smile, “open it up and see if there is a message inside.”
Reginald opened the letter and two tickets fell into his hands.
“Surprise! I managed to get us tickets to a concert at Madison Square Garden.
It was sold out, but my friend is a ticket agent. She got us the last two general admission seats.”
“Wow,” gasped Reginald, “I never would have guessed I’d get to see a real concert.
Thank you, Uncle Quincy. This is the best trip ever!”`},{id:"118",title:"The School Chorus",text:`The School Chorus

Chris is in the school chorus. The chorus is a group of students who sing together.
Chris goes to chorus practice every day after school.
At chorus practice, the students learn how to sing new songs.
First, everyone listens to their teacher sing the song. Next, they hum the song.
Then, they whistle the tune. Finally, they all sing together.
After many weeks of practice, the chorus learned eight new songs.
They were now ready to sing with the orchestra.
The orchestra is a group of students who play instruments together.
The chorus and the orchestra met in the auditorium to perform.
The music they made was beautiful. It echoed through the halls and brought joy to all who could hear it.`},{id:"119",title:"The Audition",text:`The Audition

Today is a big day for Ricardo. The theater club is holding auditions for the school play.
Acting is Ricardo’s passion. He is auditioning for the lead role.
This year’s play is about a mission to outer space.
It is packed with action and ends with a real explosion!
Ricardo walked into the theater club meeting.
He excitedly handed his permission slip to the director and found a seat.
He listened as the director explained how the audition would work.
“Remember to be creative and use your imaginations. Any questions before we begin?”
No questions. Everyone was ready to begin.
The students took turns auditioning for the director.
There was a lot of competition, but Ricardo did a great job!
Once the auditions were finished, the director announced the parts.
“This was a tough decision,” she said.
“You each made a great impression. The lead role goes to...Ricardo!”
Ricardo leaped out of his seat with joy. His friends clapped for him.
He could not wait to run home and start memorizing his lines.`},{id:"120",title:"We’re Going on an Adventure",text:`We’re Going on an Adventure

Every Sunday, Lucy spends the afternoon with her babysitter, Kaylen.
Lucy loves Kaylen because Kaylen always takes Lucy on fun and exciting adventures.
Today, Kaylen was holding a magnifying glass in one hand and a notebook in the other.
“Are you ready to go on an adventure?” Kaylen asked Lucy.
“Yes!” Lucy cried.
“On today’s adventure, we are going to become nature explorers,” explained Kaylen,
“our mission is to discover new creatures.”
Kaylen led Lucy into the backyard and helped her use the magnifying glass to look closely at the plants in the garden.
Lucy found a worm digging in the dirt and a ladybug resting on a leaf.
She saw a butterfly land on a flower and a lizard scurry under a rock.
She captured a frog. She even discovered a mother bird making a nest in a tree.
Kaylen helped Lucy draw pictures in her notebook of all the creatures she observed.
“This was one of our best adventures yet,” Lucy beamed.`},{id:"121",title:"Chris Joins a Club",text:`Chris Joins a Club

Chris wants to join a club. She wants to learn a new skill and make new friends.
The only problem is that Chris has no idea what club to join!
Luckily, there is a showcase after school where Chris can learn about all the clubs.
The club showcase is in the gym. There are rows and rows of tables with members of all the different clubs.
First, Chris visits the table for Art Club.
The Art Club members are sculptors, painters, and cartoonists.
Chris thought the art they created was nice, but she does not want to be an artist.
Next, Chris visits the table for Sports Club.
In Sports Club, you work with athletic trainers. You can learn to be a basketball player or even a baseball catcher.
Chris thought of herself as more of a sports watcher than a sports player. This is not the club for her.
Finally, Chris stops at the table for Garden Club. In Garden Club, you learn how to grow and care for plants from real botanists.
A botanist is someone who studies plants. You even work with real farmers to learn how to grow your own food.
Chris has always wanted to learn to garden. This is the perfect club for her.
She may even become a botanist or a farmer one day.`},{id:"122",title:"Stella the Chemist",text:`Stella the Chemist

Today at school, Miss Chang’s students talked about the jobs they wanted to have when they grow up.
Kenya, Wendy, and Gavin wanted to be artists. Hugo and Seema wanted to be farmers.
Taylor wanted to be a dentist. Each student seemed excited, except for Stella.
Ever since she could remember, Stella has always wanted to be a doctor so she could help people.
However, Stella is quite squeamish. If she sees needles or blood, her face turns a palish color, and she does not feel well.
“Have you ever thought about being a chemist instead?” Miss Chang asked Stella.
“What does a chemist do?” Stella asked.
Miss Chang explained that chemists conduct experiments, learn, and solve problems.
“Stella, you are bookish, so you love to read and learn. You are a hard worker, who is not foolish.
You like to use your imagination and discover new things. All these features will make you a great chemist.”
Even though this was a newish idea, Stella was already getting excited.
“Being a chemist seems like the best decision for me!” exclaimed Stella.`},{id:"123",title:"The Haunted House",text:`The Haunted House

There is a spooky two-story house at the end of Eighth Street.
Nobody knows who lives there, and nobody ever goes in or comes out.
Most of the kids in the neighborhood think this house is haunted.
Sammy, a fifth grader with curly brown hair, always wondered what would happen if she knocked on the door of that spooky old house.
One stormy night, Sammy and her younger brother walked over to the spooky house and crept up to the front porch.
The dusty wood floor creaked under their feet.
Sammy raised her shaky arm and knocked on the door. All of a sudden, the siblings heard a loud noise.
They were too scared to wait to find out what it was. They made a speedy exit across the muddy yard and ran all the way home.
By the time they got home, they were messy and sweaty and ready for a bath.
Sammy and her brother knew they would never go back to the spooky old house again, particularly on such a dark and stormy night.
They may never find out if the house was truly haunted.`},{id:"124",title:"Spreading Kindness",text:`Spreading Kindness

We all have good days and bad days. Good days are filled with brightness and happiness.
On good days it is easy to be nice to our friends and everything seems fun.
On good days annoying things don’t really bother us, and we feel a sense of calmness in our bodies.
Bad days, on the other hand, are not so great. On bad days we may be filled with sadness or loneliness.
Bad days can feel dark and scary. On bad days, it can be hard to be nice.
On bad days lots of things might bother us, and we might not be in the mood for silliness.
When we are having a good day, we have the energy we need to spread kindness to the people around us.
We can lend a smile or a helping hand and share our brightness with others.
In return, when we are having a bad day, we can lean on those kindness spreaders for the extra help we need.
Because if everyone shares a little extra kindness on their good days, we can all help each other get through our bad days.`},{id:"125",title:"Grandma’s Retirement Party",text:`Grandma’s Retirement Party

Mom knocked on Trey’s bedroom door early one Saturday morning.
“Time to get up,” she exclaimed, “we have a lot to do to get ready for Grandma’s retirement party!”
Trey yawned and stretched and made his way downstairs. He could feel the excitement in the air.
All of his aunts and uncles were already here.
He watched in amazement as everyone worked together cooking, cleaning, and setting up games and music for entertainment.
“What is a retirement party?” Trey asked his older sister.
“It’s a celebration that Grandma has finished her employment,” she replied,
“Grandma is now finished with her job as a doctor.”
When Grandma got there, Trey ran out the door and across the pavement to give her a hug.
“Grandma! Now that you are done being a doctor, what will you do all day?”
Grandma chuckled.
“Well, I am going to take lots of exciting trips, read my books, and spend more time with you and your sister.”
“Wow! That sounds like fun. When does my retirement start?” asked Trey.`},{id:"126",title:"The Indestructible Dog Toy",text:`The Indestructible Dog Toy

Cesar’s dog, Cooper, loves to play with toys. Chew toys are his favorite. The only problem is that Cooper treats his toys like they are disposable. You see, Cooper has super strong teeth and he likes to chew and tug on his toys until they are destroyed.
Cooper’s toys tend to last about a week. Once he pulled a toy apart in less than an hour! One day, Cesar brought home a gift for Cooper. “I think I finally found an indestructible dog toy,” he proclaimed. His family examined the toy. It was a set of three rubber rings linked together.
“These rings are extremely flexible and impossible to break,” Cesar explained. “They are washable so we can keep them clean. They even glow in the dark so they are visible at night!” Was it possible? Was this finally the perfect toy for Cooper? Cooper loved his new rings and chewed on them every day.
Three months later, the rings had a few visible chew marks, but they were still useable. It was remarkable. This was the longest Cooper had ever kept a toy without tearing it apart. Cesar and his family were all thrilled that they finally found an indestructible toy for their goofy, lovable pup.`},{id:"127",title:"The Triplets Go to School",text:`The Triplets Go to School

Macy, Stacy, and Tracy are triplets. They do everything together. Each morning they wake up and put on matching uniforms. Then, they get on their bicycles and ride to school. At school, they take all the same classes.
Their first class is French. The triplets are bilingual because they already speak English and Spanish. Once they learn French, they will be trilingual! Their next class is math. In math class, they learn all about different kinds of triangles. Then, in music class they practice a new song.
They always sing in unison at the biweekly show.
After lunch, they go to reading class. This is the triplets’ favorite class. Their teacher is reading the last book in a new trilogy to them. They can not wait to learn how this story ends. At the end of the day, the triplets get back on their bicycles and ride home together. They are an unbreakable trio.`},{id:"128",title:"The Carnival",text:`The Carnival

The carnival is in town! Get your tickets, grab a friend, and head on down to the fair grounds. With so many options for excitement and entertainment, everyone is bound to have a great day at the carnival.
If you are seeking adventure, head over to the midway. This is where you will find the rides. Slide down the bumpy super slide, walk through the spooky haunted house, or buckle up for a ride on the speedy roller coaster.
If you get hungry, wander over to the food trucks.
Here you will find every treat imaginable. A giant corndog, a funnel cake, and an ice-cold lemonade are the perfect carnival combination.
If you get too hot and sweaty outside, step into the expo hall.
Here you will meet farmers who can teach you about animals like chickens, pigs, and goats. You may even get to hold a baby chick! Also, there may be a cartoonist who will draw your caricature and a band playing music.
At the end of the day, everyone gathers to watch the firework display in the night sky. This part is never a disappointment. Spending the day at the carnival is always enjoyable.`}],wt=[{id:"35a",title:"Tad’s Cab",concept:"Short A Review (CVC)",sourcePage:4,paragraphs:["Tad has a cab. The cab has lots of mud on it. The cab has lots of dust in it. “The cab looks bad!” said Tad.","He got a bag of rags and a tin of wax. He dips a rag in the wax. The wax gets rid of the mud and dust. “The cab looks rad!” said Tad.","Tad got in the cab. The cab did not go. “Oh no!” said Tad, “I have to get gas!”"],text:`Tad’s Cab

Tad has a cab. The cab has lots of mud on it. The cab has lots of dust in it. “The cab looks bad!” said Tad.

He got a bag of rags and a tin of wax. He dips a rag in the wax. The wax gets rid of the mud and dust. “The cab looks rad!” said Tad.

Tad got in the cab. The cab did not go. “Oh no!” said Tad, “I have to get gas!”`},{id:"35b",title:"A Can of Jam",concept:"Nasalized A Review (an, am)",sourcePage:5,paragraphs:["Vin must get a can of jam. He ran to his pal Tam. “Tam, do you have jam?” Tam had a pan of yams but no jam.","Vin hops in his van. He stops at Nan’s. “Nan, do you have jam?” Nan has a fan and a pet ram but no jam.","Next, Vin asks Gram. “Gram, do you have jam?” “Yes,” said Gram. At last! Vin got his can of jam"],text:`A Can of Jam

Vin must get a can of jam. He ran to his pal Tam. “Tam, do you have jam?” Tam had a pan of yams but no jam.

Vin hops in his van. He stops at Nan’s. “Nan, do you have jam?” Nan has a fan and a pet ram but no jam.

Next, Vin asks Gram. “Gram, do you have jam?” “Yes,” said Gram. At last! Vin got his can of jam`},{id:"35c",title:"A Trip on the Tram",concept:"Short A Advanced Review",sourcePage:6,paragraphs:["Grant plans a trip to see his best pal, Skip. Grant gets a bag. He crams a hat, a book, and pants in the bag. Grant grabs his bag and skips to the tram stop.","The tram is at the stop! Grant gets on the tram. It is six stops to get to Skip. Grant sits and grabs his book from his bag. The tram trip is fast. Grant sees Skip at stop six. The pals have a grand trip."],text:`A Trip on the Tram

Grant plans a trip to see his best pal, Skip. Grant gets a bag. He crams a hat, a book, and pants in the bag. Grant grabs his bag and skips to the tram stop.

The tram is at the stop! Grant gets on the tram. It is six stops to get to Skip. Grant sits and grabs his book from his bag. The tram trip is fast. Grant sees Skip at stop six. The pals have a grand trip.`},{id:"36a",title:"Quiz Sid",concept:"Short I Review",sourcePage:7,paragraphs:["Sid is a fun kid. He has lots of wit. His pals ask him for tips. “What is the best spot to dig?” asks Bim. “In the big pit,” said Sid. “What is the best spot to run?” asks Kit. “On flat land,” said Sid.","His pals quiz him. “What is six plus ten?” asks Liz. “Hmm,” said Sid, “can I have a hint?”"],text:`Quiz Sid

Sid is a fun kid. He has lots of wit. His pals ask him for tips. “What is the best spot to dig?” asks Bim. “In the big pit,” said Sid. “What is the best spot to run?” asks Kit. “On flat land,” said Sid.

His pals quiz him. “What is six plus ten?” asks Liz. “Hmm,” said Sid, “can I have a hint?”`},{id:"36b",title:"Twin Gifts",concept:"Short I Advanced Review",sourcePage:8,paragraphs:["Trip has a gift for his twin, Prim. But the gift has a twist. “I hid the gift,” said Trip. “Can I have a hint?” asks Prim. “No!” Trip grins.","Prim squints. “Is it next to you?” Prim asks. “Yes.” said Trip. Prim jumps and lifts up the gift. “A book!” yips Prim.","Prim flips the book and hugs Trip. “I have the best twin!” said Prim. “No, I do!” said Trip as he grins."],text:`Twin Gifts

Trip has a gift for his twin, Prim. But the gift has a twist. “I hid the gift,” said Trip. “Can I have a hint?” asks Prim. “No!” Trip grins.

Prim squints. “Is it next to you?” Prim asks. “Yes.” said Trip. Prim jumps and lifts up the gift. “A book!” yips Prim.

Prim flips the book and hugs Trip. “I have the best twin!” said Prim. “No, I do!” said Trip as he grins.`},{id:"37a",title:"The Fox and the Frog",concept:"Short O Review",sourcePage:9,paragraphs:["The fox went to the pond to hunt frogs. As the fox ran to the pond, the frogs hid a log. The frogs see the fox, but the fox can not see the frogs.","The fox jumps on top of the log. The frogs do not hop. The fox looks next to the log. The frogs do not hop.","The fox jogs to the next log. Pop! The frogs hop from the log. Plop! The frogs hop into the pond. The fox did not get the frogs. He sobs."],text:`The Fox and the Frog

The fox went to the pond to hunt frogs. As the fox ran to the pond, the frogs hid a log. The frogs see the fox, but the fox can not see the frogs.

The fox jumps on top of the log. The frogs do not hop. The fox looks next to the log. The frogs do not hop.

The fox jogs to the next log. Pop! The frogs hop from the log. Plop! The frogs hop into the pond. The fox did not get the frogs. He sobs.`},{id:"37b",title:"Rob and His Pond",concept:"Short O Advanced Review",sourcePage:10,paragraphs:["Rob is fond of his pond. His pond is big. It is the best spot to cast a rod. Rob stands next to the pond. He sees a blob. A blob can be bad if it clogs up the pond.","Rob gets in his raft to look at the blob. Rob sees it is not a blob, it’s a frog! The frog is big and wet. The wet frog looks at Rob and hops on his raft. Rob gasps! He tilts the raft to get the frog to drop in the pond. The frog flips and flops.","At last, the frog plops in the pond. Rob is glad. He is fond of his pond, but he is not fond of frogs."],text:`Rob and His Pond

Rob is fond of his pond. His pond is big. It is the best spot to cast a rod. Rob stands next to the pond. He sees a blob. A blob can be bad if it clogs up the pond.

Rob gets in his raft to look at the blob. Rob sees it is not a blob, it’s a frog! The frog is big and wet. The wet frog looks at Rob and hops on his raft. Rob gasps! He tilts the raft to get the frog to drop in the pond. The frog flips and flops.

At last, the frog plops in the pond. Rob is glad. He is fond of his pond, but he is not fond of frogs.`},{id:"39a",title:"Dug the Pug",concept:"Short U Review",sourcePage:11,paragraphs:["Dug is a pug. He runs and has fun in the sun. But his bud, Rux, is in a rut. Rux got a cut on his leg.","Dug sees his bud is sad. Dug wags at Rux. “Let’s run in the sun.” Dug and Rux run in the sun.","“I am not in a rut,” said Rux. “I am glad,” said Dug. The pals had fun on the run."],text:`Dug the Pug

Dug is a pug. He runs and has fun in the sun. But his bud, Rux, is in a rut. Rux got a cut on his leg.

Dug sees his bud is sad. Dug wags at Rux. “Let’s run in the sun.” Dug and Rux run in the sun.

“I am not in a rut,” said Rux. “I am glad,” said Dug. The pals had fun on the run.`},{id:"39b",title:"The Mom and Cubs",concept:"Short U Advanced Review",sourcePage:12,paragraphs:["Mom and the cubs sit in the den. At dusk, Mom gets up to hunt. The cubs look glum as Mom hunts.","What did Mom hunt? Mom just hunts bugs and slugs. What did Mom do? Mom dug to get the bugs and slugs. Mom gets a big lump of bugs.","Mom is in the den. The cubs run to Mom. Gulp! The bugs and slugs are yum to the cubs!"],text:`The Mom and Cubs

Mom and the cubs sit in the den. At dusk, Mom gets up to hunt. The cubs look glum as Mom hunts.

What did Mom hunt? Mom just hunts bugs and slugs. What did Mom do? Mom dug to get the bugs and slugs. Mom gets a big lump of bugs.

Mom is in the den. The cubs run to Mom. Gulp! The bugs and slugs are yum to the cubs!`},{id:"40a",title:"Ten Men on a Jet",concept:"Short U Review",sourcePage:13,paragraphs:["Hal has a big red jet. He met ten men. The ten men ask to look at the big red jet. Hal lets the ten men get on the jet.","The men get to sit on the jet. The men get fed on the jet. Yet, the jet did not run. The ten men beg, but Hal can not get the jet to run. He must see if it has gas!"],text:`Ten Men on a Jet

Hal has a big red jet. He met ten men. The ten men ask to look at the big red jet. Hal lets the ten men get on the jet.

The men get to sit on the jet. The men get fed on the jet. Yet, the jet did not run. The ten men beg, but Hal can not get the jet to run. He must see if it has gas!`},{id:"40b",title:"The Sled",concept:"Short E Advanced Review",sourcePage:14,paragraphs:["Fred and Ben have big red sleds. The kids are on a quest to see if the sleds are fast. Fred sits on his sled. The sled is not fast. Ben jumps on his sled. The sled is not fast. The kids cannot get the sleds to be fast.","“I got it!” yelps Fred. “What is it?” asks Ben. Fred runs to the sled and jumps on. The sled is fast as can be! Fred had to be fast to get the sled to be fast.","The kids run and sled, run and sled. Ben looks up and sees the sun set. The kids have to go rest."],text:`The Sled

Fred and Ben have big red sleds. The kids are on a quest to see if the sleds are fast. Fred sits on his sled. The sled is not fast. Ben jumps on his sled. The sled is not fast. The kids cannot get the sleds to be fast.

“I got it!” yelps Fred. “What is it?” asks Ben. Fred runs to the sled and jumps on. The sled is fast as can be! Fred had to be fast to get the sled to be fast.

The kids run and sled, run and sled. Ben looks up and sees the sun set. The kids have to go rest.`},{id:"41a",title:"Nic Runs to the Book",concept:"Short Vowel Review (all)",sourcePage:15,paragraphs:["Nic did not run a lot. If he ran, he got hot. It was not fun to be hot. Nic just sits. If he sits, he is not hot.","Nic sits on the bus. He has a book to look at on the bus. Nic gets to his bus stop. “Oh!” Nic left his book on the bus.","Nic has to run to the bus to get his book. The sun was hot as Nic ran. At the next stop, Nic got on the bus and got his book. It was not fun to run but he was glad to get his book."],text:`Nic Runs to the Book

Nic did not run a lot. If he ran, he got hot. It was not fun to be hot. Nic just sits. If he sits, he is not hot.

Nic sits on the bus. He has a book to look at on the bus. Nic gets to his bus stop. “Oh!” Nic left his book on the bus.

Nic has to run to the bus to get his book. The sun was hot as Nic ran. At the next stop, Nic got on the bus and got his book. It was not fun to run but he was glad to get his book.`},{id:"41a",title:"Mom Has Lots of Jobs",concept:"Short Vowel Review (all)",sourcePage:16,paragraphs:["Mom has lots of jobs. At 7 a.m., Mom jumps on the bed. “Get up, Liv and Vic!” said Mom. “Can you get us OJ and hot buns?” asks Liv. “Yes!” said Mom.","Next, Mom runs the kids to the YMCA. “Look at me! I can hop on the mats,” said Vic. “Look at me! I can run six laps,” said Liv. At 12 p.m., Mom, the kids, and the pups went to the vet. “The pups are fit,” said the vet.","The kids and the pups have fun in the sun and mom looks at the plants. As the sun sets, mom said, “No jobs are left, kids and pups must go to bed.”"],text:`Mom Has Lots of Jobs

Mom has lots of jobs. At 7 a.m., Mom jumps on the bed. “Get up, Liv and Vic!” said Mom. “Can you get us OJ and hot buns?” asks Liv. “Yes!” said Mom.

Next, Mom runs the kids to the YMCA. “Look at me! I can hop on the mats,” said Vic. “Look at me! I can run six laps,” said Liv. At 12 p.m., Mom, the kids, and the pups went to the vet. “The pups are fit,” said the vet.

The kids and the pups have fun in the sun and mom looks at the plants. As the sun sets, mom said, “No jobs are left, kids and pups must go to bed.”`},{id:"41b",title:"Lost on a Run",concept:"Short Vowels Advanced 1",sourcePage:17,paragraphs:["West was at camp. He left his tent to run. He runs his best in the sand at camp. He runs and runs.","In a bit, he stops next to a big log to rest. He looks up and sees he is lost. West ran fast and lost his camp spot. “I have to get to the tent,” he said. He looks at his steps in the sand. Next, he sees the bend he ran past.","In the end, he gets to his tent at camp and did not have to get help."],text:`Lost on a Run

West was at camp. He left his tent to run. He runs his best in the sand at camp. He runs and runs.

In a bit, he stops next to a big log to rest. He looks up and sees he is lost. West ran fast and lost his camp spot. “I have to get to the tent,” he said. He looks at his steps in the sand. Next, he sees the bend he ran past.

In the end, he gets to his tent at camp and did not have to get help.`},{id:"41b",title:"Pet Land",concept:"Short Vowels Advanced 1",sourcePage:18,paragraphs:["Jan and Tom are the best of pals. “Let’s go to Pet Land!” said Jan to Tom. “Pet Land has a lot of pets. It is the best pet spot to get dogs, cats, frogs, and slugs,” said Jan.","The kids step into Pet Land. “What do you see?” asks Jan. “Look! The frogs jump from pad to pad! The frogs are fast!” said Tom. “Look! The dogs do flips! The dogs are fast!” said Jan. “Look! The cats spin and run! The cats are as fast as the dogs!” said Tom.","“Look! Can you spot the slug?” asks Jan. “I see the slug! The slug bends and rests on the log, but the slug is not fast,” said Tom. Pet Land is fun!"],text:`Pet Land

Jan and Tom are the best of pals. “Let’s go to Pet Land!” said Jan to Tom. “Pet Land has a lot of pets. It is the best pet spot to get dogs, cats, frogs, and slugs,” said Jan.

The kids step into Pet Land. “What do you see?” asks Jan. “Look! The frogs jump from pad to pad! The frogs are fast!” said Tom. “Look! The dogs do flips! The dogs are fast!” said Jan. “Look! The cats spin and run! The cats are as fast as the dogs!” said Tom.

“Look! Can you spot the slug?” asks Jan. “I see the slug! The slug bends and rests on the log, but the slug is not fast,” said Tom. Pet Land is fun!`},{id:"41c",title:"Fun on the Mat",concept:"Short Vowels Advanced 2",sourcePage:19,paragraphs:["Kat and Grant are best pals. “Look at that big, red mat!”, said Kat. “I can do splits and flips.” Kat steps on the mat to do a split. “Look at me, Grant!” Kat got up and did a grand flip. Grant gasps and claps at Kat.","Kat asks Grant, “What can you do on the mat?” Grant clasps his hands, jumps up, and flips. Kat claps at Grant.","“Let’s do a stunt!”, said Kat. Grant grabs Kat’s left hand to help do swift flips. Kat lands on the mat. Kat and Grant did it! The pals clap and have a blast on the mat!"],text:`Fun on the Mat

Kat and Grant are best pals. “Look at that big, red mat!”, said Kat. “I can do splits and flips.” Kat steps on the mat to do a split. “Look at me, Grant!” Kat got up and did a grand flip. Grant gasps and claps at Kat.

Kat asks Grant, “What can you do on the mat?” Grant clasps his hands, jumps up, and flips. Kat claps at Grant.

“Let’s do a stunt!”, said Kat. Grant grabs Kat’s left hand to help do swift flips. Kat lands on the mat. Kat and Grant did it! The pals clap and have a blast on the mat!`},{id:"41c",title:"The Hunt",concept:"Short Vowels Advanced 2",sourcePage:20,paragraphs:["Jen and Bronx went on a hunt. “Look at the map”, said Bronx. “Stomp on the end of the log,” said Jen. “I see the top of a bag! Let’s dig it up!” said Bronx. The bag had six gum drops.","Next, the kids went to the pond. “Look past the plant, Bronx. Can you see a bag?” asks Jen. “I see it! A bag is in the nest. It has ten mints!” said Bronx.","Last, the kids went to the big stump. In a snap, Jen said, “I see a plump bag!” Bronx ran a sprint to the bag. It had lots of red hots. “Let’s split the bags,” said Jen. “It’s a grand plan!” said Bronx."],text:`The Hunt

Jen and Bronx went on a hunt. “Look at the map”, said Bronx. “Stomp on the end of the log,” said Jen. “I see the top of a bag! Let’s dig it up!” said Bronx. The bag had six gum drops.

Next, the kids went to the pond. “Look past the plant, Bronx. Can you see a bag?” asks Jen. “I see it! A bag is in the nest. It has ten mints!” said Bronx.

Last, the kids went to the big stump. In a snap, Jen said, “I see a plump bag!” Bronx ran a sprint to the bag. It had lots of red hots. “Let’s split the bags,” said Jen. “It’s a grand plan!” said Bronx.`},{id:"42",title:"The Jazz Class",concept:"FLSZ Spelling Rule",sourcePage:21,paragraphs:["“Jill, do you want to go to a tap class or a jazz class?” asks Bess. “I want to go to a jazz class to do jumps and box steps!” said Jill. Bess adds Jill to Miss Bell’s jazz class.","“Tell your mom the class is at ten,” said Bess, “I will help you stuff your jazz bag.” Jill grabs her red bag. “What do I put in the bag?” asks Jill.","Put in a dress, but no frills. It must fit well. Next, toss in pins for your bun. Last, add your jazz book,” said Bess. “This class will be swell!” said Jill. “The best!” said Bess."],text:`The Jazz Class

“Jill, do you want to go to a tap class or a jazz class?” asks Bess. “I want to go to a jazz class to do jumps and box steps!” said Jill. Bess adds Jill to Miss Bell’s jazz class.

“Tell your mom the class is at ten,” said Bess, “I will help you stuff your jazz bag.” Jill grabs her red bag. “What do I put in the bag?” asks Jill.

Put in a dress, but no frills. It must fit well. Next, toss in pins for your bun. Last, add your jazz book,” said Bess. “This class will be swell!” said Jill. “The best!” said Bess.`},{id:"42",title:"The Dress Mess",concept:"FLSZ Spelling Rule",sourcePage:22,paragraphs:["Steff ran in the grass and fell. “I am OK,” yells Steff. Miss Puff looks at Steff. “You are OK, but your dress is a mess!” “No!” Steff frets, “Mom will fuss if the dress is a mess.” “Do not fret,” said Miss Puff, “I will buff your dress and your mom will not see the mess.”","Miss Puff rubs suds on the dress to get the mess off. Steff looks at the dress and huffs, “You can still see the mess.” “It is not bad,” said Miss Puff, “just a bit of mess left on the cuff.”","Steff sees mom. Mom sees Steff. “What is it?” asks Mom. “The dress!” sniffs Steff, “it is a mess.” Mom looks at the dress. “Do not stress. I can fix the mess. Do you want to help me?” Steff nods. Mom hugs Steff."],text:`The Dress Mess

Steff ran in the grass and fell. “I am OK,” yells Steff. Miss Puff looks at Steff. “You are OK, but your dress is a mess!” “No!” Steff frets, “Mom will fuss if the dress is a mess.” “Do not fret,” said Miss Puff, “I will buff your dress and your mom will not see the mess.”

Miss Puff rubs suds on the dress to get the mess off. Steff looks at the dress and huffs, “You can still see the mess.” “It is not bad,” said Miss Puff, “just a bit of mess left on the cuff.”

Steff sees mom. Mom sees Steff. “What is it?” asks Mom. “The dress!” sniffs Steff, “it is a mess.” Mom looks at the dress. “Do not stress. I can fix the mess. Do you want to help me?” Steff nods. Mom hugs Steff.`},{id:"43",title:"Cliff the Bull",concept:"-all, -oll, -ull",sourcePage:23,paragraphs:["Cliff is a small bull. All Cliff wants to do is go run in the grass on the hills. But in the fall, he must be in a stall. You see, Cliff stomps on the grass and it gets small. He must be in a stall for a bit, so the grass can get tall.","Cliff wants to be in the hills, but I must tell him no. Cliff is mad, so he rolls to hit the stall wall. The wall falls! Cliff runs to the hill. I call to him, but he will not go in the stall. What can I do?"],text:`Cliff the Bull

Cliff is a small bull. All Cliff wants to do is go run in the grass on the hills. But in the fall, he must be in a stall. You see, Cliff stomps on the grass and it gets small. He must be in a stall for a bit, so the grass can get tall.

Cliff wants to be in the hills, but I must tell him no. Cliff is mad, so he rolls to hit the stall wall. The wall falls! Cliff runs to the hill. I call to him, but he will not go in the stall. What can I do?`},{id:"43",title:"The Bull Frog and Troll",concept:"-all, -oll, -ull",sourcePage:24,paragraphs:["A bull frog sits on a big pad in a pond. The bull frog is sad and wants a pal. A troll sits on a hill next to the pond. The troll is sad and wants a pal. Can the bull frog and the troll be pals?","The troll pulls bugs from the tall grass on the hill. The bull frog sees the troll and hops up to him. “Can I see your bugs?” asks the bull frog. The troll grins. “Yes, I have lots of bugs you can look at.”","The troll and the bull frog go up the hill to pull bugs from the tall grass. “You are so fun,” said the troll. “Do you want to be my pal?” “You bet!” said the bull frog. So, the troll and the bull frog got to be pals."],text:`The Bull Frog and Troll

A bull frog sits on a big pad in a pond. The bull frog is sad and wants a pal. A troll sits on a hill next to the pond. The troll is sad and wants a pal. Can the bull frog and the troll be pals?

The troll pulls bugs from the tall grass on the hill. The bull frog sees the troll and hops up to him. “Can I see your bugs?” asks the bull frog. The troll grins. “Yes, I have lots of bugs you can look at.”

The troll and the bull frog go up the hill to pull bugs from the tall grass. “You are so fun,” said the troll. “Do you want to be my pal?” “You bet!” said the bull frog. So, the troll and the bull frog got to be pals.`},{id:"44",title:"Zack’s Trick",concept:"ck /k/",sourcePage:25,paragraphs:["Zack has a black bag. “Do you want to see a trick?” Zack asks his pal Brock. Brock nods. Zack picks up the bag. “Look in the bag and tell me what you see.”","Zack looks in the bag but can not see well. “Quack, quack!” Brock jumps back. “Is it a duck?” Brock asks. “No! It’s not a duck,” says Zack. Brock looks back in the bag. He still can not see well. “Cluck, Cluck!” Brock jumps back. “Is it a chick?” Brock asks. “No! It’s not a chick,” says Zack.","Zack flips the bag and a rock falls in his hand. Brock looks at Zack. “What? It’s just a rock? But what was the quack and the cluck from?” Zack grins and yells, “Quack, quack, cluck, cluck, my trick got you!”"],text:`Zack’s Trick

Zack has a black bag. “Do you want to see a trick?” Zack asks his pal Brock. Brock nods. Zack picks up the bag. “Look in the bag and tell me what you see.”

Zack looks in the bag but can not see well. “Quack, quack!” Brock jumps back. “Is it a duck?” Brock asks. “No! It’s not a duck,” says Zack. Brock looks back in the bag. He still can not see well. “Cluck, Cluck!” Brock jumps back. “Is it a chick?” Brock asks. “No! It’s not a chick,” says Zack.

Zack flips the bag and a rock falls in his hand. Brock looks at Zack. “What? It’s just a rock? But what was the quack and the cluck from?” Zack grins and yells, “Quack, quack, cluck, cluck, my trick got you!”`},{id:"45",title:"Fish in Trash",concept:"sh /sh/",sourcePage:26,paragraphs:["Shep and I go to the pond to skip rocks. As we get to the pond, we are in shock. The pond is full of trash!","“What a mess!” I gag. I see a fish is stuck in mesh from the trash. “We have to help the fish!” I yell. “We will!” Shep yells back.","We dash to the pond in a flash. Shep gets the mesh off the fish. “You are fast!” I gush. The fish swims on and we wish it well. Next, we stash the rest of the trash from the pond in a bag. We pull the bag shut. “Not bad!” Shep grins at me and we go back to skip rocks."],text:`Fish in Trash

Shep and I go to the pond to skip rocks. As we get to the pond, we are in shock. The pond is full of trash!

“What a mess!” I gag. I see a fish is stuck in mesh from the trash. “We have to help the fish!” I yell. “We will!” Shep yells back.

We dash to the pond in a flash. Shep gets the mesh off the fish. “You are fast!” I gush. The fish swims on and we wish it well. Next, we stash the rest of the trash from the pond in a bag. We pull the bag shut. “Not bad!” Shep grins at me and we go back to skip rocks.`},{id:"46",title:"Clams",concept:"Voiced th /th/",sourcePage:27,paragraphs:["Dad put a bag of fresh clams on the shelf. “Do you want to help me shuck the clams?” Dad asks. “That will be fun! Where do you get them from?” asks Nash. “Get your iPad. Let’s look that up on the web,” Dad said. Nash sees a man dig and dig in the wet sand. The man pulls up six small clams. “You find them in the sand!” said Dell. “You got it!” Dad said.","Dad hands Nash a stiff brush. He scrubs the grit off the clam shells. Then, dad helps Nash shuck the clams. Next, Dad drops them in a hot pot. Last, Dad and Nash gulp them up. “Yum! Yum!” they said."],text:`Clams

Dad put a bag of fresh clams on the shelf. “Do you want to help me shuck the clams?” Dad asks. “That will be fun! Where do you get them from?” asks Nash. “Get your iPad. Let’s look that up on the web,” Dad said. Nash sees a man dig and dig in the wet sand. The man pulls up six small clams. “You find them in the sand!” said Dell. “You got it!” Dad said.

Dad hands Nash a stiff brush. He scrubs the grit off the clam shells. Then, dad helps Nash shuck the clams. Next, Dad drops them in a hot pot. Last, Dad and Nash gulp them up. “Yum! Yum!” they said.`},{id:"47",title:"My Sloth Smells!",concept:"Unvoiced th /th/",sourcePage:28,paragraphs:["I have a pet sloth. He is as soft as cloth, but he smells of filth. I have him sit in a lot of baths. But he still smells of filth! If I do the math, this next bath will be his tenth. As he goes in the tub, I add thick suds to help the smell. It did the trick! He smells of fresh grass, not filth.","With the bath in the past, we sit and grab snacks. I had a small plum, and my pet sloth had twigs with buds on them. We were so glad the bad smell left!"],text:`My Sloth Smells!

I have a pet sloth. He is as soft as cloth, but he smells of filth. I have him sit in a lot of baths. But he still smells of filth! If I do the math, this next bath will be his tenth. As he goes in the tub, I add thick suds to help the smell. It did the trick! He smells of fresh grass, not filth.

With the bath in the past, we sit and grab snacks. I had a small plum, and my pet sloth had twigs with buds on them. We were so glad the bad smell left!`},{id:"48",title:"Chimps",concept:"ch /ch/",sourcePage:29,paragraphs:["Chad met up with Chip to go on a walk and talk. As they walk, Chad says, “I just got a book on chimps. It says they munch on ants and plants.”","“Do they run fast?” asks Chad. “Yes, they can run fast in the grass. And they can jump from branch to branch.” “Do they nap?” asks Chad. “Yes! They nap in nests of twigs.”","Chip yells, “I wish I had a chimp! I want a chimp! It can be such fun!” Chad said, “No! Chimps are not pets. They get big and can snap at you.” Chip was sad. “Get a dog!” Chad said with a grin. “Yes, a dog will be a fun pet,” said Chip and he was glad."],text:`Chimps

Chad met up with Chip to go on a walk and talk. As they walk, Chad says, “I just got a book on chimps. It says they munch on ants and plants.”

“Do they run fast?” asks Chad. “Yes, they can run fast in the grass. And they can jump from branch to branch.” “Do they nap?” asks Chad. “Yes! They nap in nests of twigs.”

Chip yells, “I wish I had a chimp! I want a chimp! It can be such fun!” Chad said, “No! Chimps are not pets. They get big and can snap at you.” Chip was sad. “Get a dog!” Chad said with a grin. “Yes, a dog will be a fun pet,” said Chip and he was glad.`},{id:"49",title:"The Brick Shop",concept:"Digraphs Review 1",sourcePage:30,paragraphs:["Thad and Dell walk in to the brick shop. In the brick shop, bricks can be lots of stuff, not just bricks. “Look at all of the bricks in the bins!” says Dell, “The big red bricks can be a ship.”","“The small tan bricks can be a cat. The small black bricks can be a rat. The cat can run with the rat.” says Thad.","Dell and Thad pick their bricks from the bins. Then, the kids look up at the clock. The hands are at 12. “Grab your bricks and your cash, Thad. We do not want to miss lunch at the crab shack!” said Dell.","“This was fun!” said Thad. “The best!” said Dell."],text:`The Brick Shop

Thad and Dell walk in to the brick shop. In the brick shop, bricks can be lots of stuff, not just bricks. “Look at all of the bricks in the bins!” says Dell, “The big red bricks can be a ship.”

“The small tan bricks can be a cat. The small black bricks can be a rat. The cat can run with the rat.” says Thad.

Dell and Thad pick their bricks from the bins. Then, the kids look up at the clock. The hands are at 12. “Grab your bricks and your cash, Thad. We do not want to miss lunch at the crab shack!” said Dell.

“This was fun!” said Thad. “The best!” said Dell.`},{id:"49",title:"We Like to Shop",concept:"Digraphs Review 1",sourcePage:31,paragraphs:["“Chet, do you want to go to the mall?” asks Trish. “Yes! The mall has the best shops. We can chit-chat as we walk,” said Chet.","Trish and Chet stop at the clock shop. Tick- tock go the clocks. Chet looks at the black clock on the wall. Next, they stop at the Snack Shack for lunch. They split fish sticks and chips.","“What do you want to do next?” asks Chet. “We can walk to the book shop,” says Trish. Chet picks a book on shells and Trish goes with a book on trucks. Trish and Chet sit on a bench with their books. What fun it is to shop at the mall with a pal!"],text:`We Like to Shop

“Chet, do you want to go to the mall?” asks Trish. “Yes! The mall has the best shops. We can chit-chat as we walk,” said Chet.

Trish and Chet stop at the clock shop. Tick- tock go the clocks. Chet looks at the black clock on the wall. Next, they stop at the Snack Shack for lunch. They split fish sticks and chips.

“What do you want to do next?” asks Chet. “We can walk to the book shop,” says Trish. Chet picks a book on shells and Trish goes with a book on trucks. Trish and Chet sit on a bench with their books. What fun it is to shop at the mall with a pal!`},{id:"50",title:"The Test",concept:"wh /w/, ph /f/",sourcePage:32,paragraphs:["“We have a math test!” said Miss Phan. “I had the book with me, but I did not look at it!” I tell Cass. “You are a whiz! You will do well!” Cass says as she whacks me on the back with a grin. I shrug at Cass. “I will have to do the test on a whim!”","Miss Phan drops the test on the desk and says, “Do not talk when you have a test.” I grab the test and look at it. I see a graph. I see which box I should check. I can see what I must do next. All in all, I should do well. I am a whiz at math. Cass said so!"],text:`The Test

“We have a math test!” said Miss Phan. “I had the book with me, but I did not look at it!” I tell Cass. “You are a whiz! You will do well!” Cass says as she whacks me on the back with a grin. I shrug at Cass. “I will have to do the test on a whim!”

Miss Phan drops the test on the desk and says, “Do not talk when you have a test.” I grab the test and look at it. I see a graph. I see which box I should check. I can see what I must do next. All in all, I should do well. I am a whiz at math. Cass said so!`},{id:"51",title:"Ping-Pong",concept:"ng /ŋ/",sourcePage:33,paragraphs:["Bing is a big fan of Ping-Pong. He brings a Ping-Pong set to hang with Cliff. Bing swung at the Ping-Pong ball. He did not miss. He hit the ball with a whack. Cliff did not have that luck. Cliff swung at the ball, but it was a swing and a miss.","Bing has a tip for Cliff, “you should pull your hand back when you swing.” Cliff pulls his hand back. He hits the ball, but it goes long. The ball hits the wall with a crash. “I can swing a golf club, but I cannot swing this thing!” said Cliff. “Then let’s golf!” says Bing."],text:`Ping-Pong

Bing is a big fan of Ping-Pong. He brings a Ping-Pong set to hang with Cliff. Bing swung at the Ping-Pong ball. He did not miss. He hit the ball with a whack. Cliff did not have that luck. Cliff swung at the ball, but it was a swing and a miss.

Bing has a tip for Cliff, “you should pull your hand back when you swing.” Cliff pulls his hand back. He hits the ball, but it goes long. The ball hits the wall with a crash. “I can swing a golf club, but I cannot swing this thing!” said Cliff. “Then let’s golf!” says Bing.`},{id:"52",title:"The Prank",concept:"ng /ŋ/ (as in nk)",sourcePage:34,paragraphs:["Link sees Gronk’s cup of milk on his desk. Link thinks, “I want to pull a prank on Gronk.” So Link adds a bit of broth to Gronk’s cup.","When Gronk gets back to his desk he drinks a big gulp from his cup. Gronk blinks. He looks a bit pink. “This milk stinks!” he thinks.","Link winks at Gronk. “What did you do, Link?” yells Gronk. “It’s a broth milk mix,” says Link as he cracks up! Gronk huffs then cracks a grin. “I could be mad but that was a fun prank.” “Thanks!” says Link, “let me get your cup, I will grab you a fresh drink. No broth!”"],text:`The Prank

Link sees Gronk’s cup of milk on his desk. Link thinks, “I want to pull a prank on Gronk.” So Link adds a bit of broth to Gronk’s cup.

When Gronk gets back to his desk he drinks a big gulp from his cup. Gronk blinks. He looks a bit pink. “This milk stinks!” he thinks.

Link winks at Gronk. “What did you do, Link?” yells Gronk. “It’s a broth milk mix,” says Link as he cracks up! Gronk huffs then cracks a grin. “I could be mad but that was a fun prank.” “Thanks!” says Link, “let me get your cup, I will grab you a fresh drink. No broth!”`},{id:"53",title:"Thrift Thrills",concept:"Digraphs Review 2",sourcePage:35,paragraphs:["Rich wants to shop at the mall. Rich picks up the phone to call his mom. “Mom, can we go to the mall?”, asks Rich. “Yes, I think we can go to the mall and thrift for stuff!”, said his mom. “What is thrift?”, asks Rich. “We can shop for lots of things but not spend lots of funds!”, said Mom. “That would be fun!” said Rich. His mom picks him up at home and they go to the mall.","They walk into the thrift spot. They see a stack of pants and a rack of belts. Rich asks his mom, “Do you want this?”. His mom nods, “Yes! Thank you, Rich!”. Rich and his mom fill up the bags with the things they thrift. “I did not think we could get this much!”, said Rich. “You can when you thrift!” said Mom. “It is a thrill to get a lot of stuff!”, said Rich."],text:`Thrift Thrills

Rich wants to shop at the mall. Rich picks up the phone to call his mom. “Mom, can we go to the mall?”, asks Rich. “Yes, I think we can go to the mall and thrift for stuff!”, said his mom. “What is thrift?”, asks Rich. “We can shop for lots of things but not spend lots of funds!”, said Mom. “That would be fun!” said Rich. His mom picks him up at home and they go to the mall.

They walk into the thrift spot. They see a stack of pants and a rack of belts. Rich asks his mom, “Do you want this?”. His mom nods, “Yes! Thank you, Rich!”. Rich and his mom fill up the bags with the things they thrift. “I did not think we could get this much!”, said Rich. “You can when you thrift!” said Mom. “It is a thrill to get a lot of stuff!”, said Rich.`},{id:"53",title:"Ping and Tink",concept:"Digraphs Review 2",sourcePage:36,paragraphs:["Ping and Tink are in Miss Lang’s class. “What would you like to do, Ping?” asks Tink. “Let me think. I want to do stamps. Can you bring them to me?” asks Ping. Tink gets the stamps with the ink pads. “I have the stamps plus a tub of felt tip pens,” says Tink. “I will get the blank books from the shelf,” says Ping.","“What should we stamp in our books?” asks Tink. “Let’s stamp what we wish for. I wish I had six dogs,” says Ping. “I wish I could go to a brick shop. I would get bins and bins of bricks,” says Tink. The kids stamp and stamp. Then, Ping looks sad. “This is a big mess! The dogs look mad! Can you help me, Tink?” Tink stamps on Ping’s book. “There you go! The dogs are glad.” “Thank you so much! You are the best pal!” says Ping."],text:`Ping and Tink

Ping and Tink are in Miss Lang’s class. “What would you like to do, Ping?” asks Tink. “Let me think. I want to do stamps. Can you bring them to me?” asks Ping. Tink gets the stamps with the ink pads. “I have the stamps plus a tub of felt tip pens,” says Tink. “I will get the blank books from the shelf,” says Ping.

“What should we stamp in our books?” asks Tink. “Let’s stamp what we wish for. I wish I had six dogs,” says Ping. “I wish I could go to a brick shop. I would get bins and bins of bricks,” says Tink. The kids stamp and stamp. Then, Ping looks sad. “This is a big mess! The dogs look mad! Can you help me, Tink?” Tink stamps on Ping’s book. “There you go! The dogs are glad.” “Thank you so much! You are the best pal!” says Ping.`},{id:"54",title:"The Lost Case",concept:"a_e /ā/",sourcePage:37,paragraphs:["Chase has a gift from his dad. It is a black case with a red lock. He can lock his things in the case so they are safe. He drops the case by the gate in the sun. Then he goes to snack on his grapes.","When Chase goes back to the gate, he can not find the case. “Who would take this case?” says Chase. His sis, Mave, waves from the path to the gate.","“Did you take the case Dad gave me?” Chase asks Mave. “No!” Mave said with a shake. “This is not a game!” Chase states. “I did not take the case!” Mave yells.","Mom walks up to them. “What is it?” “Mave hid the case dad gave me, and she will not tell me where it is.” said Chase. “I did not take the case! This is just a tale from Chase!” said Mave.","Mom takes a look at Chase and grins. “Chase, what Mave said is not fake. I have the case. It is in the shade so it would not fade in the sun.”","“See!” says Mave, “I would not take your case.” “I made a mess of this,” said Chase. Mave hugs Chase. Chase hugs Mave back. Mom, Chase, and Mave go sit in the shade with Chase’s case."],text:`The Lost Case

Chase has a gift from his dad. It is a black case with a red lock. He can lock his things in the case so they are safe. He drops the case by the gate in the sun. Then he goes to snack on his grapes.

When Chase goes back to the gate, he can not find the case. “Who would take this case?” says Chase. His sis, Mave, waves from the path to the gate.

“Did you take the case Dad gave me?” Chase asks Mave. “No!” Mave said with a shake. “This is not a game!” Chase states. “I did not take the case!” Mave yells.

Mom walks up to them. “What is it?” “Mave hid the case dad gave me, and she will not tell me where it is.” said Chase. “I did not take the case! This is just a tale from Chase!” said Mave.

Mom takes a look at Chase and grins. “Chase, what Mave said is not fake. I have the case. It is in the shade so it would not fade in the sun.”

“See!” says Mave, “I would not take your case.” “I made a mess of this,” said Chase. Mave hugs Chase. Chase hugs Mave back. Mom, Chase, and Mave go sit in the shade with Chase’s case.`},{id:"55",title:"Let’s Go on a Bike Ride",concept:"i_e",sourcePage:38,paragraphs:["Blake and Mike plan to go on a long bike ride. They want to go fast to save time. “We could bring my kite and have fun with it”, said Blake. “I like that!” said Mike.","They bike up the wide hill. “Let’s ride up fast!” said Blake. “Yes, we have a mile left to go,” said Mike. “Look!” said Blake. Blake and Mike pass by five kids on bikes. They are on a bike ride up the same hill. “Fast, fast, fast! We want to save time for fun with the kite!” said Blake.","Oh no! They crash into a shrub. “Help!” whines Mike. Blake helps Mike get back on his bike. “Thanks. You are such a pal!” said Mike. “This is quite a bike ride!” said Blake. “What a thrill!” said Mike. Blake and Mike ride to the top of the hill with their kite in hand. Blake and Mike had lots of fun!"],text:`Let’s Go on a Bike Ride

Blake and Mike plan to go on a long bike ride. They want to go fast to save time. “We could bring my kite and have fun with it”, said Blake. “I like that!” said Mike.

They bike up the wide hill. “Let’s ride up fast!” said Blake. “Yes, we have a mile left to go,” said Mike. “Look!” said Blake. Blake and Mike pass by five kids on bikes. They are on a bike ride up the same hill. “Fast, fast, fast! We want to save time for fun with the kite!” said Blake.

Oh no! They crash into a shrub. “Help!” whines Mike. Blake helps Mike get back on his bike. “Thanks. You are such a pal!” said Mike. “This is quite a bike ride!” said Blake. “What a thrill!” said Mike. Blake and Mike ride to the top of the hill with their kite in hand. Blake and Mike had lots of fun!`},{id:"56",title:"The Bone",concept:"o_e /ō/",sourcePage:39,paragraphs:["The phone rang. Cole woke in bed and sat up. “Who is it?” asks Cole. “It’s mom. Can you help me?” “With what?” asks Cole. “I went to get the bone for Stone, the pup, but it fell in a hole!” said Mom. “I can help!” said Cole.","Cole drove to Mom’s home as quick as he could to get the bone for Stone. “The bone is white. It got stuck in there!” said Mom. Cole dove in the hole to get the bone. Mom froze. Did Cole save Stone’s bone? Yes! Cole got the bone for Stone. “Thank you so much, Cole!” said Mom."],text:`The Bone

The phone rang. Cole woke in bed and sat up. “Who is it?” asks Cole. “It’s mom. Can you help me?” “With what?” asks Cole. “I went to get the bone for Stone, the pup, but it fell in a hole!” said Mom. “I can help!” said Cole.

Cole drove to Mom’s home as quick as he could to get the bone for Stone. “The bone is white. It got stuck in there!” said Mom. Cole dove in the hole to get the bone. Mom froze. Did Cole save Stone’s bone? Yes! Cole got the bone for Stone. “Thank you so much, Cole!” said Mom.`},{id:"57",title:"Make and Take",concept:"VCe Review 1; e_e /ē/",sourcePage:40,paragraphs:["Blaze and Slone are in a make and take class. Blaze looks at the list of things to make. “I would like to glitz up a frame. What do you want to do, Slone?”","Slone looks at the list. “I would like to glaze a cake,” she says, “Do we have time to do these things?” “I think we do. Let’s sit here on this bench,” Blaze adds.","Slone grabs the cake kit. She goes with a white and pink theme. She frosts the cake white. Then she pipes pink roses on the top. Blaze grabs the frame kit. They stick glass stones on the frame. Then they add shells.","“The frame looks fab!” said Slone. “The cake looks grand!” said Blaze. Slone hands the cake to Blaze. “A gift for you,” she says with a smile. Blaze grins back and gifts Slone the frame."],text:`Make and Take

Blaze and Slone are in a make and take class. Blaze looks at the list of things to make. “I would like to glitz up a frame. What do you want to do, Slone?”

Slone looks at the list. “I would like to glaze a cake,” she says, “Do we have time to do these things?” “I think we do. Let’s sit here on this bench,” Blaze adds.

Slone grabs the cake kit. She goes with a white and pink theme. She frosts the cake white. Then she pipes pink roses on the top. Blaze grabs the frame kit. They stick glass stones on the frame. Then they add shells.

“The frame looks fab!” said Slone. “The cake looks grand!” said Blaze. Slone hands the cake to Blaze. “A gift for you,” she says with a smile. Blaze grins back and gifts Slone the frame.`},{id:"57",title:"Bash with a Theme",concept:"VCe Review 1; e_e /ē/",sourcePage:41,paragraphs:["Steve wants to have a big bash with a theme. He asks his pal Cade to do it with him. Steve said, “Let’s use this twine to make nine spheres.” “Yes! We can make them look like globes.” says Cade. “Do you think we have time to make a dome cake?” ask Steve. “Yes! We can make it shine like the sun!” Cade states. “My, my, that would be quite a fine cake for the theme!”","“Would you like it if Mike came?” asks Steve. “I could call him on the phone.” “Yes, tell him the date. He likes a fun theme” says Cade. On the date of the bash, Mike got on his bike and rode to Steve’s home. The mates had quite the time at the bash with the theme! What do you think the theme was?"],text:`Bash with a Theme

Steve wants to have a big bash with a theme. He asks his pal Cade to do it with him. Steve said, “Let’s use this twine to make nine spheres.” “Yes! We can make them look like globes.” says Cade. “Do you think we have time to make a dome cake?” ask Steve. “Yes! We can make it shine like the sun!” Cade states. “My, my, that would be quite a fine cake for the theme!”

“Would you like it if Mike came?” asks Steve. “I could call him on the phone.” “Yes, tell him the date. He likes a fun theme” says Cade. On the date of the bash, Mike got on his bike and rode to Steve’s home. The mates had quite the time at the bash with the theme! What do you think the theme was?`},{id:"58",title:"Dane the Duke",concept:"u_e /ū/, /yū/",sourcePage:42,paragraphs:["Once there was a fine duke. His name was Dane. Dane was not the same as the rest of the dukes in his land. Dane was the one duke that was a bit odd. Dane chose to ride a mule. The rest of the dukes did not ride mules. When Dane sat on his throne, he would hum tunes. The rest of the dukes did not hum tunes on their thrones. The dukes were all rude to Dane for his mules and his tunes. Yet, Dane was not rude to them.","Once, a duke fell off his bike in a sand dune. Dane was the one who gave the duke a hand. When the duke got up, he said thank you to Dane. “I can see what a brave pal you are,” said the duke. We should not be so rude to you. “Thanks,” said Dane, “would you like a ride home on my mule?”"],text:`Dane the Duke

Once there was a fine duke. His name was Dane. Dane was not the same as the rest of the dukes in his land. Dane was the one duke that was a bit odd. Dane chose to ride a mule. The rest of the dukes did not ride mules. When Dane sat on his throne, he would hum tunes. The rest of the dukes did not hum tunes on their thrones. The dukes were all rude to Dane for his mules and his tunes. Yet, Dane was not rude to them.

Once, a duke fell off his bike in a sand dune. Dane was the one who gave the duke a hand. When the duke got up, he said thank you to Dane. “I can see what a brave pal you are,” said the duke. We should not be so rude to you. “Thanks,” said Dane, “would you like a ride home on my mule?”`},{id:"59",title:"Shane and Tate Hike",concept:"VCe Review 2",sourcePage:43,paragraphs:["Shane and Tate like to go for hikes in the grove. They like to hike as the sun sets. Once, they went for a hike and came back with quite the tale.","They were a mile into the hike when Shane said they should take a rest. “If we stop, we will be home late,” said Tate with a wise tone. “It is not that late yet,” said Shane with a wave. “I vote we rest.” “Fine,” said Tate, “but just for a bit.”","Shane and Tate sat on a pine log. Just then, Shane felt a poke on his leg. He rose with a shock. The poke was a sting! “Get up,” yells Shane, “we sat in a hive!” Tate and Shane sprint from the hive. They did not stop til they got to the end of the hike. Tate and Shane huff and puff as they walk back home from their hike. Shane lifts his pant leg and looks at his sting. “So much for a nice rest.”"],text:`Shane and Tate Hike

Shane and Tate like to go for hikes in the grove. They like to hike as the sun sets. Once, they went for a hike and came back with quite the tale.

They were a mile into the hike when Shane said they should take a rest. “If we stop, we will be home late,” said Tate with a wise tone. “It is not that late yet,” said Shane with a wave. “I vote we rest.” “Fine,” said Tate, “but just for a bit.”

Shane and Tate sat on a pine log. Just then, Shane felt a poke on his leg. He rose with a shock. The poke was a sting! “Get up,” yells Shane, “we sat in a hive!” Tate and Shane sprint from the hive. They did not stop til they got to the end of the hike. Tate and Shane huff and puff as they walk back home from their hike. Shane lifts his pant leg and looks at his sting. “So much for a nice rest.”`},{id:"59",title:"My Wife, Suze",concept:"VCe Review 2",sourcePage:44,paragraphs:["My wife, Suze, was once a cute bride. On the eve we wed, Suze chose to standby my side as my date for life. We ate lime cake with my best mates. We got nine gifts. One mate gave us a rose vase. We had quite a fine time! At the end of the bash, we gave one last wave to the mates.","Next, we rode home in a fine white truck. We sat close while we spoke of the fun time we had. We still have that white truck. When I ride in it, I smile and think of that time with pride. I was wise to make Suze my bride for life!"],text:`My Wife, Suze

My wife, Suze, was once a cute bride. On the eve we wed, Suze chose to standby my side as my date for life. We ate lime cake with my best mates. We got nine gifts. One mate gave us a rose vase. We had quite a fine time! At the end of the bash, we gave one last wave to the mates.

Next, we rode home in a fine white truck. We sat close while we spoke of the fun time we had. We still have that white truck. When I ride in it, I smile and think of that time with pride. I was wise to make Suze my bride for life!`},{id:"62",title:"Dove Love",concept:"VCe Review 3, VCe Exceptions",sourcePage:45,paragraphs:["I have some doves that live by my home. I love to give the doves some white rice as a snack. I sit on the bench and toss rice in the grass. Some have come close to me as they munch on their rice. They like to come close when I sit still. Once, one of the doves sat by my side while he ate.","When they are done with their snacks, they take their place back on the line by my home. Then they flock to the nests where they live. If they could talk, I think they would thank me. I just love those doves!"],text:`Dove Love

I have some doves that live by my home. I love to give the doves some white rice as a snack. I sit on the bench and toss rice in the grass. Some have come close to me as they munch on their rice. They like to come close when I sit still. Once, one of the doves sat by my side while he ate.

When they are done with their snacks, they take their place back on the line by my home. Then they flock to the nests where they live. If they could talk, I think they would thank me. I just love those doves!`},{id:"63",title:"Benches for the Shop",concept:"-es",sourcePage:46,paragraphs:["Chase and Kate have skills with axes. They can use their axes to chop and slice and make nice things. Their bosses ask them to use their axes to make two benches for their shop. Chase and Kate grab their glasses to be safe. Chase slashes up a slab of pine with his ax. Kate makes frames for the benches and then they add the legs.","Kate brushes the dust off the benches and Chase rushes to bag up the trash. They are all done. Kate does not think the benches look bad at all. Their bosses love the benches and ask if they can make a shelf next."],text:`Benches for the Shop

Chase and Kate have skills with axes. They can use their axes to chop and slice and make nice things. Their bosses ask them to use their axes to make two benches for their shop. Chase and Kate grab their glasses to be safe. Chase slashes up a slab of pine with his ax. Kate makes frames for the benches and then they add the legs.

Kate brushes the dust off the benches and Chase rushes to bag up the trash. They are all done. Kate does not think the benches look bad at all. Their bosses love the benches and ask if they can make a shelf next.`},{id:"63",title:"The Boxes",concept:"-es",sourcePage:47,paragraphs:["“Brice, can you help me?” calls dad. Brice looks up. He sees two boxes. “What can I help you with?” asks Brice. “We have to look at the stuff in these boxes to see what we can get rid of.” Dad hands a box to Brice. “You look in this one and I will look in that one.”","Brice looks in his box. He sees some of his mom’s dresses. “Dad, does mom still want these dresses?” “Let’s ask. Set those dresses to the side.” Brice looks back in the box. He sees a set of dishes. “Dad, should we toss these dishes?” “No, I like those.” said dad, “Set them to the side.”","Brice sees one last thing in the box. It’s a set of glasses. “Dad, should we get rid of these glasses?” “No, we can’t get rid of those, they match the dishes. Set them to the side.” Brice taps his hand to his face and grins. “Dad, we did not get rid of one thing!”"],text:`The Boxes

“Brice, can you help me?” calls dad. Brice looks up. He sees two boxes. “What can I help you with?” asks Brice. “We have to look at the stuff in these boxes to see what we can get rid of.” Dad hands a box to Brice. “You look in this one and I will look in that one.”

Brice looks in his box. He sees some of his mom’s dresses. “Dad, does mom still want these dresses?” “Let’s ask. Set those dresses to the side.” Brice looks back in the box. He sees a set of dishes. “Dad, should we toss these dishes?” “No, I like those.” said dad, “Set them to the side.”

Brice sees one last thing in the box. It’s a set of glasses. “Dad, should we get rid of these glasses?” “No, we can’t get rid of those, they match the dishes. Set them to the side.” Brice taps his hand to his face and grins. “Dad, we did not get rid of one thing!”`},{id:"64",title:"Brent’s Snacks",concept:"-ed",sourcePage:48,paragraphs:["Brent loves snacks. His dad packed him many things that filled up his lunch bag. Brent crunched and chomped on his snacks at lunch. As he munched, Brent looked at his mates. They did not have any snacks. They looked like they wanted some of his snacks.","Brent does not like to give up his snacks. His dad hinted that he should check to see if his mates wanted any. Brent just grunted at his dad. Brent’s dad added two snacks to his bag just in case.","Brent looked at the two snacks and called to his mates. He asked if they wanted any. The mates said “YES!” Brent handed them the frosted snacks. They chanted, “Many thanks, Brent!” Brent was shocked that it felt so nice to give his snacks to his mates."],text:`Brent’s Snacks

Brent loves snacks. His dad packed him many things that filled up his lunch bag. Brent crunched and chomped on his snacks at lunch. As he munched, Brent looked at his mates. They did not have any snacks. They looked like they wanted some of his snacks.

Brent does not like to give up his snacks. His dad hinted that he should check to see if his mates wanted any. Brent just grunted at his dad. Brent’s dad added two snacks to his bag just in case.

Brent looked at the two snacks and called to his mates. He asked if they wanted any. The mates said “YES!” Brent handed them the frosted snacks. They chanted, “Many thanks, Brent!” Brent was shocked that it felt so nice to give his snacks to his mates.`},{id:"64",title:"A Get Well Note",concept:"-ed",sourcePage:49,paragraphs:["Miss Hall called the names on the class list, “Jane.” “Here!” “Quin.” “Here!” “Hope, Hope?” “She is still at home sick. She has a stuffed up nose, and a flushed face,” said Tate.","Quin asked, “Can we make Hope a get well note?” Luke added, “Let’s bring Hope a stuffed dog as a get well gift.” “That is a fine plan,” said Miss Hall.","“What should we write in the note?” asked Jane. The kids looked at Miss Hall for help. Miss Hall said, “To Hope. We want you to get well fast. We send you lots of hugs. We miss you. Best wishes. From, Miss Hall’s class.” Tate said, “You rocked it, Miss Hall!” The kids all missed Hope. They were pumped to send the note and gift."],text:`A Get Well Note

Miss Hall called the names on the class list, “Jane.” “Here!” “Quin.” “Here!” “Hope, Hope?” “She is still at home sick. She has a stuffed up nose, and a flushed face,” said Tate.

Quin asked, “Can we make Hope a get well note?” Luke added, “Let’s bring Hope a stuffed dog as a get well gift.” “That is a fine plan,” said Miss Hall.

“What should we write in the note?” asked Jane. The kids looked at Miss Hall for help. Miss Hall said, “To Hope. We want you to get well fast. We send you lots of hugs. We miss you. Best wishes. From, Miss Hall’s class.” Tate said, “You rocked it, Miss Hall!” The kids all missed Hope. They were pumped to send the note and gift.`},{id:"65",title:"The Best Job For Me",concept:"-ing",sourcePage:50,paragraphs:["I have a job selling plants, but I do not like it much. I have been thinking of looking for a job in singing and acting. I have been selling plants a long time, but it is not my calling. I want to sing and act on a stage.","I do a fine job selling plants, but it does not make me glad. I could be bad at singing and acting, but I must give it a shot. I will stop wishing for what I want and make a change. The stage is calling my name."],text:`The Best Job For Me

I have a job selling plants, but I do not like it much. I have been thinking of looking for a job in singing and acting. I have been selling plants a long time, but it is not my calling. I want to sing and act on a stage.

I do a fine job selling plants, but it does not make me glad. I could be bad at singing and acting, but I must give it a shot. I will stop wishing for what I want and make a change. The stage is calling my name.`},{id:"65",title:"Packing for the Trip",concept:"-ing",sourcePage:51,paragraphs:["We are going on a trip to the Gulf. Dad rented an RV for the five of us. We were all helping to pack. I was stuffing the sun hats in a bag. We would use those for our ride on the shrimp ship. Jace was looking for the rake and dip net so we could dig for clams. Kim was packing the mesh bag and sifting pans for shelling.","Mom was checking the list. “We missed some stuff. Jace, bring the rods for fishing. Kim, grab the snacks for camping.” Dad came into the RV and said, “We did a nice job packing, kids. This trip will be smashing!”"],text:`Packing for the Trip

We are going on a trip to the Gulf. Dad rented an RV for the five of us. We were all helping to pack. I was stuffing the sun hats in a bag. We would use those for our ride on the shrimp ship. Jace was looking for the rake and dip net so we could dig for clams. Kim was packing the mesh bag and sifting pans for shelling.

Mom was checking the list. “We missed some stuff. Jace, bring the rods for fishing. Kim, grab the snacks for camping.” Dad came into the RV and said, “We did a nice job packing, kids. This trip will be smashing!”`},{id:"66",title:"Camping in the Grove",concept:"Closed & Open Syllables",sourcePage:52,paragraphs:["“Hi! Jan! Do you want to go on a camping trip with me?” Luke asks his friend. “What do you do when you go camping?” asks Jan.","“We can bring a tent to camp in, nap sacks for resting, and snacks for snacking. We can ride bikes, go swim in the lake, and look for bugs,” said Luke.","“Hmm,” Jan thinks. “I like to ride bikes, but I cannot swim, and I do not like bugs. What else can we do?”","“Hmm,” Luke thinks. “We can take a walk next to the lake and look for rocks not bugs.”","“Yes, I like that plan,” said Jan. Let’s go camping!","The two friends have a blast on the camping trip. They ride bikes and spot rocks in the tall grass. They snack on chips, then get in the nap sacks to chat and rest. When the sun sets, they get in their tents and go to bed."],text:`Camping in the Grove

“Hi! Jan! Do you want to go on a camping trip with me?” Luke asks his friend. “What do you do when you go camping?” asks Jan.

“We can bring a tent to camp in, nap sacks for resting, and snacks for snacking. We can ride bikes, go swim in the lake, and look for bugs,” said Luke.

“Hmm,” Jan thinks. “I like to ride bikes, but I cannot swim, and I do not like bugs. What else can we do?”

“Hmm,” Luke thinks. “We can take a walk next to the lake and look for rocks not bugs.”

“Yes, I like that plan,” said Jan. Let’s go camping!

The two friends have a blast on the camping trip. They ride bikes and spot rocks in the tall grass. They snack on chips, then get in the nap sacks to chat and rest. When the sun sets, they get in their tents and go to bed.`},{id:"66",title:"My Pet Po",concept:"Closed & Open Syllables",sourcePage:53,paragraphs:["I have a cute dog. His name is Po. We met when he was one. We have been best friends since then. Po is not a fan of walks and does not like runs. If it was up to him, he would just nap all the time.","It is my job to make Po go for a walk. I can get him to come when the sun is up. We walk for a bit but then he stops. He sniffs the grass and then sits. I call him but he will not come to me. He just looks up at me and smiles.","I can’t help but smile back at him. He is just so cute. In fact, the sun is quite nice. I sit on the grass next to Po. We can take a walk in a bit."],text:`My Pet Po

I have a cute dog. His name is Po. We met when he was one. We have been best friends since then. Po is not a fan of walks and does not like runs. If it was up to him, he would just nap all the time.

It is my job to make Po go for a walk. I can get him to come when the sun is up. We walk for a bit but then he stops. He sniffs the grass and then sits. I call him but he will not come to me. He just looks up at me and smiles.

I can’t help but smile back at him. He is just so cute. In fact, the sun is quite nice. I sit on the grass next to Po. We can take a walk in a bit.`},{id:"67a",title:"Sage and Stepmom Pack Lunch",concept:"Compound Words",sourcePage:54,paragraphs:["“Sage, would you like to bring a friend with us to the pond?” Stepmom asked. Sage said, “Yes, I will ask Jane to come.” Stepmom said, “OK, we must make a list of things to take in the backpack for lunch. Can you help me do that?” Sage said, “Yes, when I am done looking for my laptop login.”","“Are you all set to help me, Sage?” asked Stepmom. “Here I am! What do you have on the list?” “I have milkshakes, hotdogs, and chips. Is there something else you would like to add?” asked Stepmom. “Jane likes cupcakes. I love drumsticks!” said Sage. Stepmom smiled and said, “I will add those things because I love you.” Sage grinned and gave Stepmom a big hug.","When Sage, Jane, and Stepmom got to the pond, they ate their lunch and tossed the softball. Sometimes they stay at the pond til sunset, but this time they left at two because Jane had to get home. Sage and Jane thanked Stepmom for helping them have such a fun trip to the pond."],text:`Sage and Stepmom Pack Lunch

“Sage, would you like to bring a friend with us to the pond?” Stepmom asked. Sage said, “Yes, I will ask Jane to come.” Stepmom said, “OK, we must make a list of things to take in the backpack for lunch. Can you help me do that?” Sage said, “Yes, when I am done looking for my laptop login.”

“Are you all set to help me, Sage?” asked Stepmom. “Here I am! What do you have on the list?” “I have milkshakes, hotdogs, and chips. Is there something else you would like to add?” asked Stepmom. “Jane likes cupcakes. I love drumsticks!” said Sage. Stepmom smiled and said, “I will add those things because I love you.” Sage grinned and gave Stepmom a big hug.

When Sage, Jane, and Stepmom got to the pond, they ate their lunch and tossed the softball. Sometimes they stay at the pond til sunset, but this time they left at two because Jane had to get home. Sage and Jane thanked Stepmom for helping them have such a fun trip to the pond.`},{id:"67a",title:"The Big Game",concept:"Compound Words",sourcePage:55,paragraphs:["I love softball. Once, many of my friends said they were going to the big softball game. I asked my mom to take me. My mom could not take me because she had to pick up my sis from kickball. I was upset. Then, mom made a phone call. “Your stepdad will take you to the game, my love.” I got my backpack and left for the game with my stepdad.","When we got there, we went to the snack stand. My stepdad got a drumstick for himself and a hotdog for me. We walked uphill to the stands at sunset. The softball game is going. When they hit a home run, we all yelled. I felt like I hit the jackpot. My stepdad and I got a snapshot to send to mom. We had the best time at the softball game."],text:`The Big Game

I love softball. Once, many of my friends said they were going to the big softball game. I asked my mom to take me. My mom could not take me because she had to pick up my sis from kickball. I was upset. Then, mom made a phone call. “Your stepdad will take you to the game, my love.” I got my backpack and left for the game with my stepdad.

When we got there, we went to the snack stand. My stepdad got a drumstick for himself and a hotdog for me. We walked uphill to the stands at sunset. The softball game is going. When they hit a home run, we all yelled. I felt like I hit the jackpot. My stepdad and I got a snapshot to send to mom. We had the best time at the softball game.`},{id:"67b",title:"A Sunset Picnic",concept:"Closed/Closed",sourcePage:56,paragraphs:["Janet and Robin are best friends. They are planning a sunset picnic. “We can set up the picnic next to the sandbox,” said Janet. “We can pack a basket full of snacks and a big sandwich to munch on”, said Robin.","Robin packs the basket with the snacks and a sandwich to split. Janet packs the drinks and a blanket. Robin adds plates. Janet adds napkins. “We are all set to have a picnic!”","The friends walk to the sandbox and set up the blanket. Then, they grab the plates and napkins for the snacks. “Look at the sunset!” said Janet. The friends have fun at the picnic. “I want to do this often!”, said Robin. “That is a grand plan!”, said Janet."],text:`A Sunset Picnic

Janet and Robin are best friends. They are planning a sunset picnic. “We can set up the picnic next to the sandbox,” said Janet. “We can pack a basket full of snacks and a big sandwich to munch on”, said Robin.

Robin packs the basket with the snacks and a sandwich to split. Janet packs the drinks and a blanket. Robin adds plates. Janet adds napkins. “We are all set to have a picnic!”

The friends walk to the sandbox and set up the blanket. Then, they grab the plates and napkins for the snacks. “Look at the sunset!” said Janet. The friends have fun at the picnic. “I want to do this often!”, said Robin. “That is a grand plan!”, said Janet.`},{id:"67b",title:"The Game of Tennis",concept:"Closed/Closed",sourcePage:57,paragraphs:["Tennis is quite a fun game. It looks complex, but I can give you some tips. The game calls for a net, ball, and racket. You use the racket to hit the ball across the net. When your racket makes contact with the ball, swing fast.","In a tennis contest, you must win six games to win a set. Then, you must win two sets to win it all. The game goes fast and can be a bit hectic. Do not panic, you will get the hang of it. I must admit, a rapid tennis game is fun to witness. So, grab a friend and give tennis a go!"],text:`The Game of Tennis

Tennis is quite a fun game. It looks complex, but I can give you some tips. The game calls for a net, ball, and racket. You use the racket to hit the ball across the net. When your racket makes contact with the ball, swing fast.

In a tennis contest, you must win six games to win a set. Then, you must win two sets to win it all. The game goes fast and can be a bit hectic. Do not panic, you will get the hang of it. I must admit, a rapid tennis game is fun to witness. So, grab a friend and give tennis a go!`},{id:"68",title:"Fun Moments with Noel and Keke",concept:"Open/Closed",sourcePage:58,paragraphs:["Noel and Keke are done with class. The friends want to find something fun to do. Noel gives Keke a list of things they could do. Keke looks at the list. “I would like to go to the Bash and Splash! We can get a suntan and swim in the lake.”","Noel nods at Keke. “Yes, Bash and Splash will be fun. I also want to do a U-Pick. We can pick lemons at Levi’s Ranch. I like a splash of fresh lemon in my drink.”","Keke grins. “Yes, we can do the U-Pick. Last, I want to go to Swing Zone. The zip line is so fast!”","“Okay,” said Noel, “We have to get going if we want to have time to do all of these fun things!”","“Well then, let’s go!” said Keke.","The friends had a blast at the Bash and Splash, the U- Pick, and the Swing Zone. They were so glad class was done so they could do these fun things!"],text:`Fun Moments with Noel and Keke

Noel and Keke are done with class. The friends want to find something fun to do. Noel gives Keke a list of things they could do. Keke looks at the list. “I would like to go to the Bash and Splash! We can get a suntan and swim in the lake.”

Noel nods at Keke. “Yes, Bash and Splash will be fun. I also want to do a U-Pick. We can pick lemons at Levi’s Ranch. I like a splash of fresh lemon in my drink.”

Keke grins. “Yes, we can do the U-Pick. Last, I want to go to Swing Zone. The zip line is so fast!”

“Okay,” said Noel, “We have to get going if we want to have time to do all of these fun things!”

“Well then, let’s go!” said Keke.

The friends had a blast at the Bash and Splash, the U- Pick, and the Swing Zone. They were so glad class was done so they could do these fun things!`},{id:"68",title:"The Pumpkin Place",concept:"Open/Closed",sourcePage:59,paragraphs:["Raven loves pumpkins. When it is Fall, Raven likes to go to The Pumpkin Place to get a pumpkin. This is where all the best pumpkins are. Raven gets in the truck and drives to The Pumpkin Place. She walks in and takes a moment to look at all the pumpkins. She sees they are lined up by size.","Raven must find the best pumpkin to take home. It must be big, but not so big that she cannot pick it up. She spots one that looks nice. When she picks it up, she sees that it has a scratch on the side. “This is not my pumpkin,” she thinks. Then she spots it. The best pumpkin. She looks at it from all sides. No spots, no scratches. “This is it!” Raven yelps with pride.","Raven puts the pumpkin in the truck. She stops to get a hot drink and a donut for a snack. As she munches on the donut, she thinks of where she will put her pumpkin when she gets home."],text:`The Pumpkin Place

Raven loves pumpkins. When it is Fall, Raven likes to go to The Pumpkin Place to get a pumpkin. This is where all the best pumpkins are. Raven gets in the truck and drives to The Pumpkin Place. She walks in and takes a moment to look at all the pumpkins. She sees they are lined up by size.

Raven must find the best pumpkin to take home. It must be big, but not so big that she cannot pick it up. She spots one that looks nice. When she picks it up, she sees that it has a scratch on the side. “This is not my pumpkin,” she thinks. Then she spots it. The best pumpkin. She looks at it from all sides. No spots, no scratches. “This is it!” Raven yelps with pride.

Raven puts the pumpkin in the truck. She stops to get a hot drink and a donut for a snack. As she munches on the donut, she thinks of where she will put her pumpkin when she gets home.`},{id:"72",title:"Hide and Find",concept:"Long VCC",sourcePage:60,paragraphs:["Colt is a wild child. He likes to hide from his friends. Colt was at his old friend Keon’s home. When Keon was not looking, Colt hid behind a hutch.","“Where did you go?” Keon yelled. Colt did not call back. When Keon walked past the hutch, Colt bolted and hid behind a gold desk.","“Colt, I do not like this game. It’s time to stop!” Keon yelled. But Colt did not stop. He ran from the gold desk and hid in the tall hedge. Keon got a glimpse of Colt’s jacket behind the hedge. “There you are!”","“Colt, I told you I do not like this game,” Keon scolds, “I do not like it when you hide or when I have to find you.” “I did not think you would be mad. I think the game is fun,” Colt said.","“That is because you are a wild child and I am not,” Keon responds. Keon and Colt both felt bad. The two friends made up and switched to a game they both like."],text:`Hide and Find

Colt is a wild child. He likes to hide from his friends. Colt was at his old friend Keon’s home. When Keon was not looking, Colt hid behind a hutch.

“Where did you go?” Keon yelled. Colt did not call back. When Keon walked past the hutch, Colt bolted and hid behind a gold desk.

“Colt, I do not like this game. It’s time to stop!” Keon yelled. But Colt did not stop. He ran from the gold desk and hid in the tall hedge. Keon got a glimpse of Colt’s jacket behind the hedge. “There you are!”

“Colt, I told you I do not like this game,” Keon scolds, “I do not like it when you hide or when I have to find you.” “I did not think you would be mad. I think the game is fun,” Colt said.

“That is because you are a wild child and I am not,” Keon responds. Keon and Colt both felt bad. The two friends made up and switched to a game they both like.`},{id:"76",title:"Henry and the Sock",concept:"Ending Patterns Review",sourcePage:61,paragraphs:["Henry is a funny puppy. He is the only pet in the Tobinsky family. He does what he is told…most of the time. You see, Henry loves socks. If Henry finds a sock, he takes hold of it and will not let it go. The Tobinskys try to mind Henry all the time so he cannot snatch their socks.","One day, the Tobinskys sat at the dining table to do a simple puzzle. Henry was on the rug next to the table. This was Henry’s lucky moment. At the edge of the rug, there was an old pink sock. Henry’s body wiggles and he jolts up to get the sock. All of a sudden, Poppa Tobinsky spots Henry and lifts him up with a giggle. The silly puppy did not get the sock, but he did get some belly rubs."],text:`Henry and the Sock

Henry is a funny puppy. He is the only pet in the Tobinsky family. He does what he is told…most of the time. You see, Henry loves socks. If Henry finds a sock, he takes hold of it and will not let it go. The Tobinskys try to mind Henry all the time so he cannot snatch their socks.

One day, the Tobinskys sat at the dining table to do a simple puzzle. Henry was on the rug next to the table. This was Henry’s lucky moment. At the edge of the rug, there was an old pink sock. Henry’s body wiggles and he jolts up to get the sock. All of a sudden, Poppa Tobinsky spots Henry and lifts him up with a giggle. The silly puppy did not get the sock, but he did get some belly rubs.`},{id:"82",title:"The Nurse Workshop",concept:"er, ir, ur, w + or /er/",sourcePage:62,paragraphs:["Lenora is a nurse. She is going to a workshop to sharpen her skills. As she enters the workshop, she sees a girl in a pink shirt. That is her friend, Birdy. Lenora taps Birdy and murmurs hello. Birdy perks up. “This is superb!” she says, “I am so happy to see another friend here.”","In the first part of the workshop, Lenora and Birdy take turns checking their vitals. Next, they work on mending burns. Third, they work on fixing broken bones. The girls are thrilled. “What a perfect workshop. I love being a nurse.” says Lenora. “Will I see you at the next one?” asks Birdy. “Do not worry, I would not miss it,” Lenora confirms."],text:`The Nurse Workshop

Lenora is a nurse. She is going to a workshop to sharpen her skills. As she enters the workshop, she sees a girl in a pink shirt. That is her friend, Birdy. Lenora taps Birdy and murmurs hello. Birdy perks up. “This is superb!” she says, “I am so happy to see another friend here.”

In the first part of the workshop, Lenora and Birdy take turns checking their vitals. Next, they work on mending burns. Third, they work on fixing broken bones. The girls are thrilled. “What a perfect workshop. I love being a nurse.” says Lenora. “Will I see you at the next one?” asks Birdy. “Do not worry, I would not miss it,” Lenora confirms.`},{id:"83",title:"Backyard Garden",concept:"R-Controlled Vowels Review",sourcePage:63,paragraphs:["Zury loves to work in the backyard garden with her father. There is nothing quite like it. The birds chirp under the sun and the buds are pretty in the garden. Zury has worked in the garden since she was a little girl. One of her first chores was to spend mornings in the garden.","She has found that there is an art to garden work. It is not hard, but you have to be smart. Her father has a chart that tells them when to water the plants. Zury is in charge of the reports on the chart. The reports tell which part of the dirt is fine for plants and which part could use some help. Zury thinks this is the best kind of work in the world. She is happy to have a part in the garden with her father."],text:`Backyard Garden

Zury loves to work in the backyard garden with her father. There is nothing quite like it. The birds chirp under the sun and the buds are pretty in the garden. Zury has worked in the garden since she was a little girl. One of her first chores was to spend mornings in the garden.

She has found that there is an art to garden work. It is not hard, but you have to be smart. Her father has a chart that tells them when to water the plants. Zury is in charge of the reports on the chart. The reports tell which part of the dirt is fine for plants and which part could use some help. Zury thinks this is the best kind of work in the world. She is happy to have a part in the garden with her father.`},{id:"84",title:"Playing at the Arcade",concept:"ai, ay /ā/",sourcePage:64,paragraphs:["Today is Faith’s birthday. Cain has paid for them to go to the arcade. As Faith and Cain walk inside, they see a lot of different games. “I’m going to play Pac- Man! I love the theme song,” said Faith. Cain runs over to a pinball game. “This one makes clacks, dings, and pops. It’s so much fun!” he yells.","Next, Faith and Cain play the crane game. Cain wants to win a stuffed animal for Faith. He sees a black and tan snail. He moves the crane back and forth, but it sways. The crane drops the snail. The first try is a fail. He has another go at it and wins!","Before the kids go to lunch, they stop by the photo stand. “Your birthday is a very important day, Faith. Let’s take a photo together,” says Cain. The kids take lots of snap shots. “This has to be my best birthday ever!” said Faith. “I’m glad!” said Cain."],text:`Playing at the Arcade

Today is Faith’s birthday. Cain has paid for them to go to the arcade. As Faith and Cain walk inside, they see a lot of different games. “I’m going to play Pac- Man! I love the theme song,” said Faith. Cain runs over to a pinball game. “This one makes clacks, dings, and pops. It’s so much fun!” he yells.

Next, Faith and Cain play the crane game. Cain wants to win a stuffed animal for Faith. He sees a black and tan snail. He moves the crane back and forth, but it sways. The crane drops the snail. The first try is a fail. He has another go at it and wins!

Before the kids go to lunch, they stop by the photo stand. “Your birthday is a very important day, Faith. Let’s take a photo together,” says Cain. The kids take lots of snap shots. “This has to be my best birthday ever!” said Faith. “I’m glad!” said Cain.`},{id:"85",title:"Jay’s Jeep",concept:"ee, ea, ey /ē/",sourcePage:65,paragraphs:["Jay dreamed of being sixteen for a long time. When he turned sixteen, he could finally drive all by himself. In the weeks before Jay’s sixteenth birthday, his father spent time teaching him to drive. He had to keep both hands on the wheel. He had to have his seatbelt on and limit his speed. “When you drive, being safe is important above all else,” Jay’s father told him.","On Jay’s sixteenth birthday, he and his father went to the car dealership. Jay saved his money for weeks and weeks. He could not wait to spend it on a car. Among the sea of cars in the lot, Jay saw a neon green Jeep. He peeked inside and held the steering wheel. He beeped the horn and beamed. “This is the one I want,” he screamed.","When Jay saw the fee for the Jeep, his face fell. “This Jeep is not cheap. I need to pick another one.” “Wait,” said Jay’s father, “I will give you the extra money you need. Consider it your birthday treat.” Jay was so stunned he could not speak. He got to keep the Jeep!","“Who will you take on the first ride?” asked Jay’s father. “You!” beamed Jay, “Let’s take a ride to the beach.”"],text:`Jay’s Jeep

Jay dreamed of being sixteen for a long time. When he turned sixteen, he could finally drive all by himself. In the weeks before Jay’s sixteenth birthday, his father spent time teaching him to drive. He had to keep both hands on the wheel. He had to have his seatbelt on and limit his speed. “When you drive, being safe is important above all else,” Jay’s father told him.

On Jay’s sixteenth birthday, he and his father went to the car dealership. Jay saved his money for weeks and weeks. He could not wait to spend it on a car. Among the sea of cars in the lot, Jay saw a neon green Jeep. He peeked inside and held the steering wheel. He beeped the horn and beamed. “This is the one I want,” he screamed.

When Jay saw the fee for the Jeep, his face fell. “This Jeep is not cheap. I need to pick another one.” “Wait,” said Jay’s father, “I will give you the extra money you need. Consider it your birthday treat.” Jay was so stunned he could not speak. He got to keep the Jeep!

“Who will you take on the first ride?” asked Jay’s father. “You!” beamed Jay, “Let’s take a ride to the beach.”`},{id:"86",title:"The Snowy Coast",concept:"oa, ow, oe /ō/",sourcePage:66,paragraphs:["The drive to the coast was long and slow. The roadside was filled with heaps of snow. Snowflakes were still floating from the sky above. Joan groaned in the back seat. “Are we there yet?” she asked again. “Not yet. Maybe you and Rowan can play games,” said mom. Joan and Rowan start with a bubble gum blowing contest. Joan blows the bigger bubble and wins! Next, they look for things out the window. Joan sees a boat tugging coal on the water.","Rowan sees a yellow train covered in snow on the long railroad. Dad asks Joan and Rowan if they saw the doe with the spotted coat eating oats by the road. “What is a doe?” asks Rowan. “A doe is a female deer” says dad. Joan leans against the window so she can see better. “That doe is thirsty, look at her drink!” says Joan. The snow keeps falling harder and faster. “When we get to the coast, we will need to unload the car quickly because it is very cold!” said Rowan. “Are we there yet?” Joan asks again."],text:`The Snowy Coast

The drive to the coast was long and slow. The roadside was filled with heaps of snow. Snowflakes were still floating from the sky above. Joan groaned in the back seat. “Are we there yet?” she asked again. “Not yet. Maybe you and Rowan can play games,” said mom. Joan and Rowan start with a bubble gum blowing contest. Joan blows the bigger bubble and wins! Next, they look for things out the window. Joan sees a boat tugging coal on the water.

Rowan sees a yellow train covered in snow on the long railroad. Dad asks Joan and Rowan if they saw the doe with the spotted coat eating oats by the road. “What is a doe?” asks Rowan. “A doe is a female deer” says dad. Joan leans against the window so she can see better. “That doe is thirsty, look at her drink!” says Joan. The snow keeps falling harder and faster. “When we get to the coast, we will need to unload the car quickly because it is very cold!” said Rowan. “Are we there yet?” Joan asks again.`},{id:"87",title:"Night Light",concept:"ie, igh /ī/",sourcePage:67,paragraphs:["I have always been afraid of the dark. I do not like nighttime because it is so dark. Again and again, I find myself in a state of fright each night. I do not want to be afraid of the dark. I want to fight this fright. I go to my mother for some insight. “I am tired of being afraid of nighttime,” I cry. She sighs and pats my thigh. “What if I told you there was a way to see some light at night?”","At nightfall my mother calls me over to the window. I come close to her, and she holds me tight. “I am always with you,” she says as she turns off the light. I try my best to fight the fright I feel without the light. Just then, lightning flashes in the sky above. It is so bright it seems to light up the whole world. To my delight, the lightning strikes again and again. It lights up the sky each time. I turn to my mother and smile. “Thank you for your insight. Why are moms always right?” She grins and hugs me tight. We watch the lightning until I fall asleep. When the sun comes back up, I almost miss the night."],text:`Night Light

I have always been afraid of the dark. I do not like nighttime because it is so dark. Again and again, I find myself in a state of fright each night. I do not want to be afraid of the dark. I want to fight this fright. I go to my mother for some insight. “I am tired of being afraid of nighttime,” I cry. She sighs and pats my thigh. “What if I told you there was a way to see some light at night?”

At nightfall my mother calls me over to the window. I come close to her, and she holds me tight. “I am always with you,” she says as she turns off the light. I try my best to fight the fright I feel without the light. Just then, lightning flashes in the sky above. It is so bright it seems to light up the whole world. To my delight, the lightning strikes again and again. It lights up the sky each time. I turn to my mother and smile. “Thank you for your insight. Why are moms always right?” She grins and hugs me tight. We watch the lightning until I fall asleep. When the sun comes back up, I almost miss the night.`},{id:"89",title:"Firewood",concept:"oo, u /oo/",sourcePage:68,paragraphs:["Woody wanted to make a campfire in his backyard. The only problem was that he did not have any firewood. He went door to door to ask his friends if they had any firewood. One friend said, “I do not have firewood, but I could use your help. I need to remove this bush from my yard.” Woody agrees to help his friend. He pushed and pulled but the bush would not budge. Woody took a rest and looked for some tips on his phone.","“I can use a hook to get rid of the bush,” Woody said as he returned to the stubborn bush. He put the hook on the trunk of the bush and pushed, pulled, and shook. It took a lot of work, but the bush gave way.","Woody cut up the wood from the bush and went back to his friend’s door. “You poor thing! That was one mean fight!” said his friend. “Let me give you some money for your hard work.” Woody shook his head. “It was hard but look, I turned the bush into firewood.” Woody and his friend took the firewood to Woody’s backyard and made a big campfire."],text:`Firewood

Woody wanted to make a campfire in his backyard. The only problem was that he did not have any firewood. He went door to door to ask his friends if they had any firewood. One friend said, “I do not have firewood, but I could use your help. I need to remove this bush from my yard.” Woody agrees to help his friend. He pushed and pulled but the bush would not budge. Woody took a rest and looked for some tips on his phone.

“I can use a hook to get rid of the bush,” Woody said as he returned to the stubborn bush. He put the hook on the trunk of the bush and pushed, pulled, and shook. It took a lot of work, but the bush gave way.

Woody cut up the wood from the bush and went back to his friend’s door. “You poor thing! That was one mean fight!” said his friend. “Let me give you some money for your hard work.” Woody shook his head. “It was hard but look, I turned the bush into firewood.” Woody and his friend took the firewood to Woody’s backyard and made a big campfire.`},{id:"90",title:"Raccoon in the Garden",concept:"oo /ū/",sourcePage:69,paragraphs:["Everyone on my street loves to garden. Each Spring, there is a contest to see who has the best garden. I think my garden can win. My plants are in bloom. I have had my tools in hand and my work boots on all day for many days now. My son has even been helping me. The plants that are blooming the best are my mushrooms.","Today was the day of the contest. My son and I looked at the garden from the window. My son shook my arm. “Racoon!” he yelled. I turned and there was a racoon sniffing at the mushrooms! We zoomed out the door to shoo the raccoon away before it could scoop up a mushroom.","“Scoot!” I yelled. The raccoon got spooked and ran away. “Good!” said my son, “the raccoon left.” I looked at the garden. “Not good,” I grumbled, “the racoon stomped on the mushrooms.”","“Stay cool. We can fix this!” my son said. He picked up a tool and removed the broken mushrooms. Then we smoothed all the dirt in place. We got the garden fixed just in time for the contest.","The judge came over to look at the garden. She took a photo of the mushrooms and told us that we won!"],text:`Raccoon in the Garden

Everyone on my street loves to garden. Each Spring, there is a contest to see who has the best garden. I think my garden can win. My plants are in bloom. I have had my tools in hand and my work boots on all day for many days now. My son has even been helping me. The plants that are blooming the best are my mushrooms.

Today was the day of the contest. My son and I looked at the garden from the window. My son shook my arm. “Racoon!” he yelled. I turned and there was a racoon sniffing at the mushrooms! We zoomed out the door to shoo the raccoon away before it could scoop up a mushroom.

“Scoot!” I yelled. The raccoon got spooked and ran away. “Good!” said my son, “the raccoon left.” I looked at the garden. “Not good,” I grumbled, “the racoon stomped on the mushrooms.”

“Stay cool. We can fix this!” my son said. He picked up a tool and removed the broken mushrooms. Then we smoothed all the dirt in place. We got the garden fixed just in time for the contest.

The judge came over to look at the garden. She took a photo of the mushrooms and told us that we won!`},{id:"91",title:"Dewey’s Birthday Lunch",concept:"ew, ui, ue /ū/",sourcePage:70,paragraphs:["Dewey’s birthday is this month. His crew wants to find a new place to have a birthday lunch for him. Sue thinks they should go to the place she visited last Tuesday. It had tasty cheeseburgers. Dave thinks they should go to the place he went last Thursday. It had amazing nachos. Sue’s burger place won.","On Dewey’s birthday, the whole group was ordering food and drinks. Dewey got an apple juice to start. Then he ordered a cheeseburger with a side of fruit. Sue ordered grapefruit juice and blue crab soup. Dave ordered a meaty stew. The crew chewed and chewed until the bill was due. Then the staff came with a free cake with a candle on it. The crew sang and Dewey made a wish on the candle. Happy Birthday, Dewey!"],text:`Dewey’s Birthday Lunch

Dewey’s birthday is this month. His crew wants to find a new place to have a birthday lunch for him. Sue thinks they should go to the place she visited last Tuesday. It had tasty cheeseburgers. Dave thinks they should go to the place he went last Thursday. It had amazing nachos. Sue’s burger place won.

On Dewey’s birthday, the whole group was ordering food and drinks. Dewey got an apple juice to start. Then he ordered a cheeseburger with a side of fruit. Sue ordered grapefruit juice and blue crab soup. Dave ordered a meaty stew. The crew chewed and chewed until the bill was due. Then the staff came with a free cake with a candle on it. The crew sang and Dewey made a wish on the candle. Happy Birthday, Dewey!`},{id:"93",title:"The Art Contest",concept:"au, aw, augh /aw/",sourcePage:71,paragraphs:["Lawson loves to draw. He is self-taught, which means he has never had a formal art lesson. He has spent many hours over the last few months sharpening his raw talent. He has drawn hawks with claws, a fawn at dawn, and a racoon that he saw in his yard. Each time he draws, his skills increase.","Once day, Lawson went to the art supply store to get some fresh markers for his drawings. There he saw a flyer for a drawing contest in August. The contest was to draw a family portrait. Lawson was good at drawing animals, but he had never drawn people before. He felt a bit intimidated by the contest, but he chose to be brave and enter.","Next, he launched a mission to find a family to draw. He explained the contest to one of his friends. His friend offered himself and his baby son as models. This caused Lawson to leap with delight. Now he was ready to pursue the prize.","Lawson had his friend hold the baby and stand on the lawn. Lawson started to draw, but then the baby bawled. “Try to sit instead,” said Lawson. They sat, but then the baby started to crawl. Lawson got the baby a ball to hold. The baby took the ball and held still. At last, Lawson could draw the family portrait. He created the perfect piece to enter the contest.","Lawson hauled his drawing to the art store. The judge was thrilled with his work. Lawson won the contest, and the judge presented him with the prize."],text:`The Art Contest

Lawson loves to draw. He is self-taught, which means he has never had a formal art lesson. He has spent many hours over the last few months sharpening his raw talent. He has drawn hawks with claws, a fawn at dawn, and a racoon that he saw in his yard. Each time he draws, his skills increase.

Once day, Lawson went to the art supply store to get some fresh markers for his drawings. There he saw a flyer for a drawing contest in August. The contest was to draw a family portrait. Lawson was good at drawing animals, but he had never drawn people before. He felt a bit intimidated by the contest, but he chose to be brave and enter.

Next, he launched a mission to find a family to draw. He explained the contest to one of his friends. His friend offered himself and his baby son as models. This caused Lawson to leap with delight. Now he was ready to pursue the prize.

Lawson had his friend hold the baby and stand on the lawn. Lawson started to draw, but then the baby bawled. “Try to sit instead,” said Lawson. They sat, but then the baby started to crawl. Lawson got the baby a ball to hold. The baby took the ball and held still. At last, Lawson could draw the family portrait. He created the perfect piece to enter the contest.

Lawson hauled his drawing to the art store. The judge was thrilled with his work. Lawson won the contest, and the judge presented him with the prize.`},{id:"94",title:"The Surprise Breakfast",concept:"ea /ĕ/, a /ŏ/",sourcePage:72,paragraphs:["On Monday, Seth headed home with a note. The class breakfast party was on Wednesday, and it was Seth’s turn to cook. His father read the note, shook his head, and began to sweat. “Today is Tuesday! I do not have time to prep! Could we swap days with someone else?”","Seth looked at his father with dread. “No! I made a promise to the squad that you would cook for them on Wednesday.” His father was swamped but he did not want to let his son down. He leapt up and took a sip of water and a deep breath. “Let’s head to the shop. We have an hour to wander.”","At the shop, Seth wanted to grab bread for French toast. Father said, “Squash that idea! We do not have time.” Then, Seth wanted to grab items to make waffles. “Get the frozen ones instead!” his father shouted. On their way out, they snatched some grape spread and fruit. “Waffles with grape spread and fruit on top will be healthy and easy,” said Seth. Wednesday morning Seth watched with a smile as his father cooked breakfast at dawn to feed his classmates."],text:`The Surprise Breakfast

On Monday, Seth headed home with a note. The class breakfast party was on Wednesday, and it was Seth’s turn to cook. His father read the note, shook his head, and began to sweat. “Today is Tuesday! I do not have time to prep! Could we swap days with someone else?”

Seth looked at his father with dread. “No! I made a promise to the squad that you would cook for them on Wednesday.” His father was swamped but he did not want to let his son down. He leapt up and took a sip of water and a deep breath. “Let’s head to the shop. We have an hour to wander.”

At the shop, Seth wanted to grab bread for French toast. Father said, “Squash that idea! We do not have time.” Then, Seth wanted to grab items to make waffles. “Get the frozen ones instead!” his father shouted. On their way out, they snatched some grape spread and fruit. “Waffles with grape spread and fruit on top will be healthy and easy,” said Seth. Wednesday morning Seth watched with a smile as his father cooked breakfast at dawn to feed his classmates.`},{id:"95",title:"Delroy and Booker at Camp",concept:"oi, oy /oi/",sourcePage:73,paragraphs:["Delroy and Booker try to do all things with each other. In February they play hockey and in March they play football on the same teams. Yet, they spend every hour, even every minute waiting for June when they go to camp.","For a week each year they can boycott bedtime, dig in the soil with no voice saying no, join boys in fishing boats, run races, play tag at nighttime, and more.","This year their plans may be spoiled. On Monday, Delroy tells Booker that he will not be joining him at camp this June. Booker feels destroyed by Delroy’s choice. Delroy pointed to all the fun Booker would have at camp, but Booker waved away the noise of his voice. In the time leading up to June, Booker would not see Delroy once.","When Booker made it to camp, no boy could change his bad mood. He sulked to his cabin and slumped on to his bunk. He looked at his nightstand and saw a note with his name on it. He opened the note. It was from Delroy!","Dear Booker, I wish I could be at camp with you. I told the boys all of the fun things we do, and they promised to take my place. Have fun. I will see next month. Your friend, Delroy","Booker smiled. He was glad to have such a good friend."],text:`Delroy and Booker at Camp

Delroy and Booker try to do all things with each other. In February they play hockey and in March they play football on the same teams. Yet, they spend every hour, even every minute waiting for June when they go to camp.

For a week each year they can boycott bedtime, dig in the soil with no voice saying no, join boys in fishing boats, run races, play tag at nighttime, and more.

This year their plans may be spoiled. On Monday, Delroy tells Booker that he will not be joining him at camp this June. Booker feels destroyed by Delroy’s choice. Delroy pointed to all the fun Booker would have at camp, but Booker waved away the noise of his voice. In the time leading up to June, Booker would not see Delroy once.

When Booker made it to camp, no boy could change his bad mood. He sulked to his cabin and slumped on to his bunk. He looked at his nightstand and saw a note with his name on it. He opened the note. It was from Delroy!

Dear Booker, I wish I could be at camp with you. I told the boys all of the fun things we do, and they promised to take my place. Have fun. I will see next month. Your friend, Delroy

Booker smiled. He was glad to have such a good friend.`},{id:"96",title:"The Clown Show",concept:"ou, ow /ow/",sourcePage:74,paragraphs:["In February, there is a clown show downtown every Monday night. This is Scout’s favorite show in the world. His father vowed to take him each week. Scout counts down the hours and minutes until the show. When it is time to go, Scout bounces out of the house. He plows past the loud crowd and shouts when the clowns enter the outdoor stage. The first clown is dressed like a cowboy. He mounts his horse and rides around getting howls from the crowd. The next clown gives heart-shaped flowers to a clown with a frown. Somehow, the flower turns the clown’s frown upside down.","At the end of the show, all the clowns are jumping around on stage. Scout’s eyes cannot focus. There are too many clowns for him to count. Scout looks at his father and makes a heart shape with his hands. His father gives him a hug. Without a word, they head back to the house. What a great night at the clown show. Scout cannot wait to go back next week!"],text:`The Clown Show

In February, there is a clown show downtown every Monday night. This is Scout’s favorite show in the world. His father vowed to take him each week. Scout counts down the hours and minutes until the show. When it is time to go, Scout bounces out of the house. He plows past the loud crowd and shouts when the clowns enter the outdoor stage. The first clown is dressed like a cowboy. He mounts his horse and rides around getting howls from the crowd. The next clown gives heart-shaped flowers to a clown with a frown. Somehow, the flower turns the clown’s frown upside down.

At the end of the show, all the clowns are jumping around on stage. Scout’s eyes cannot focus. There are too many clowns for him to count. Scout looks at his father and makes a heart shape with his hands. His father gives him a hug. Without a word, they head back to the house. What a great night at the clown show. Scout cannot wait to go back next week!`},{id:"98",title:"Wadson Bakes Bread",concept:"kn /n/, wr /r/, mb /m/",sourcePage:75,paragraphs:["Wadson liked to bake. He was known for his bread. When his friends talked about his bread, they called it “the bomb!” He had a knack for kneading rolls with his knuckles. His friends could not ever stop eating his bread. They ate it as soon as he would make it and never left a crumb.","Wadson worked hard to make bread for his friends. One day, as he was kneading his rolls, something felt wrong. His wrists were so sore they were almost numb. He wrung his hands thinking of what he could do. He didn’t want to stop, but he could not keep working with sore wrists. He walked back and forth, back and forth just thinking of what he could do.","All of a sudden, he knew what to do! He took some note cards and pens and knelt at his desk. He wrote and wrote. He gave each of his friends a card with the steps for baking bread. Now he could rest his wrists while his friends kneaded the bread!"],text:`Wadson Bakes Bread

Wadson liked to bake. He was known for his bread. When his friends talked about his bread, they called it “the bomb!” He had a knack for kneading rolls with his knuckles. His friends could not ever stop eating his bread. They ate it as soon as he would make it and never left a crumb.

Wadson worked hard to make bread for his friends. One day, as he was kneading his rolls, something felt wrong. His wrists were so sore they were almost numb. He wrung his hands thinking of what he could do. He didn’t want to stop, but he could not keep working with sore wrists. He walked back and forth, back and forth just thinking of what he could do.

All of a sudden, he knew what to do! He took some note cards and pens and knelt at his desk. He wrote and wrote. He gave each of his friends a card with the steps for baking bread. Now he could rest his wrists while his friends kneaded the bread!`},{id:"99",title:"Art Class",concept:"-s/-es",sourcePage:76,paragraphs:["Joy and Shawn like going to art class. Miss Smith teaches them how to do many things such as sketch and paint. Today, they are going to paint animals in the snow. “First, you will sketch the foxes. Then you will use different shades of paint. Joy, can you get the brushes and paper? Shawn, can you get the paint sets and cups?” The kids pass out the art stuff and start to paint.","Joy asks, “Miss Smith, how do I make it look like snow is falling?” Miss Smith answers, “You can flick your brush like this.” Shawn mixes brown and white paint to make a light brown tint. Miss Smith said, “Shawn, don’t forget to use several coats on the foxes’ fur. It will make the fur look plush and full.”","At the end of class, Miss Smith says she likes the children’s art. Joy said, “We do good because you teach us well.” Miss Smith hugs the kids."],text:`Art Class

Joy and Shawn like going to art class. Miss Smith teaches them how to do many things such as sketch and paint. Today, they are going to paint animals in the snow. “First, you will sketch the foxes. Then you will use different shades of paint. Joy, can you get the brushes and paper? Shawn, can you get the paint sets and cups?” The kids pass out the art stuff and start to paint.

Joy asks, “Miss Smith, how do I make it look like snow is falling?” Miss Smith answers, “You can flick your brush like this.” Shawn mixes brown and white paint to make a light brown tint. Miss Smith said, “Shawn, don’t forget to use several coats on the foxes’ fur. It will make the fur look plush and full.”

At the end of class, Miss Smith says she likes the children’s art. Joy said, “We do good because you teach us well.” Miss Smith hugs the kids.`},{id:"100",title:"Wesley and Whitney",concept:"–er, -est",sourcePage:77,paragraphs:["Wesley and Whitney are twins who love to compete. Whitney boasts that she is two minutes older than Wesley and Wesley brags that he is one inch taller than Whitney.","They compete all day. At breakfast they each tried to eat the most. “I can eat the tallest waffle stack!” Wesley said. “That waffle stack is not the tallest, mine is taller!” Whitney said. At school, the twins always peeked at each other’s papers. “My work is neater than yours!” said Whitney. “No, my work is the neatest!” shouted Wesley. During math, they both called out the answers as fast as they could. “I have the sharpest mind!” yelped Wesley. “No, my mind is sharper!” Whitney responded. Being the best was important to the twins. That is until one Wednesday in February when everything changed.","Wesley and Whitney were at track practice. They both wanted to be the fastest. “On your mark, get set, go!” yelled Coach and they were off! The twins were neck and neck until a pebble flew up from the ground and hit Whitney. “My eye!” She yelled and fell down. Wesley slowed down. He looked back at his twin who was hurt. He did not want to be quicker than Whitney anymore. He helped her up and they finished the race together. The twins still like to compete, but now they know they are stronger and better when they help each other."],text:`Wesley and Whitney

Wesley and Whitney are twins who love to compete. Whitney boasts that she is two minutes older than Wesley and Wesley brags that he is one inch taller than Whitney.

They compete all day. At breakfast they each tried to eat the most. “I can eat the tallest waffle stack!” Wesley said. “That waffle stack is not the tallest, mine is taller!” Whitney said. At school, the twins always peeked at each other’s papers. “My work is neater than yours!” said Whitney. “No, my work is the neatest!” shouted Wesley. During math, they both called out the answers as fast as they could. “I have the sharpest mind!” yelped Wesley. “No, my mind is sharper!” Whitney responded. Being the best was important to the twins. That is until one Wednesday in February when everything changed.

Wesley and Whitney were at track practice. They both wanted to be the fastest. “On your mark, get set, go!” yelled Coach and they were off! The twins were neck and neck until a pebble flew up from the ground and hit Whitney. “My eye!” She yelled and fell down. Wesley slowed down. He looked back at his twin who was hurt. He did not want to be quicker than Whitney anymore. He helped her up and they finished the race together. The twins still like to compete, but now they know they are stronger and better when they help each other.`},{id:"101",title:"Nurse Kent",concept:"–ly",sourcePage:78,paragraphs:["Kent’s dream was to be a nurse. He wanted this job so badly. He felt like it would be the highest honor to be a nurse.","Kent decided to enroll in classes. He instantly loved what they were teaching him. It was a lot of work and very costly, but he bravely kept going. He was happy to show off his newly learned skills.","Kent goes to the hospital with his teacher to practice his nursing skills. It is his turn to demonstrate how to treat a sick child. He calmly walks up to the child’s bedside and puts on gloves to safely check for a fever. The child is slightly warm and has a bad rash. Kent quickly grabs some ointment and gently spreads it on the rash. Then he carefully covers the rash with gauze. Kent’s teacher is proud of his work.","After many years of studying, Kent passed all of his classes and exams. He is finally a nurse! He loves his highly demanding job and could not dream of doing anything else."],text:`Nurse Kent

Kent’s dream was to be a nurse. He wanted this job so badly. He felt like it would be the highest honor to be a nurse.

Kent decided to enroll in classes. He instantly loved what they were teaching him. It was a lot of work and very costly, but he bravely kept going. He was happy to show off his newly learned skills.

Kent goes to the hospital with his teacher to practice his nursing skills. It is his turn to demonstrate how to treat a sick child. He calmly walks up to the child’s bedside and puts on gloves to safely check for a fever. The child is slightly warm and has a bad rash. Kent quickly grabs some ointment and gently spreads it on the rash. Then he carefully covers the rash with gauze. Kent’s teacher is proud of his work.

After many years of studying, Kent passed all of his classes and exams. He is finally a nurse! He loves his highly demanding job and could not dream of doing anything else.`},{id:"103",title:"The Unkind Rumor",concept:"un-",sourcePage:79,paragraphs:["Today, Roscoe uncovered an unkind rumor about his friend, May. He wanted to find out the truth, so he went to speak to her directly.","When he asked her about the rumor, May exclaimed, “That is untrue! Where in the world did you hear such an unreal statement? Be honest, Roscoe!” Roscoe was unable to uncover where he had heard this hurtful tale. “Do you truly think this about me?” asks May. “Are you spreading this around town? This makes me very unhappy!”","“I did not trust what I was told. I think it is untrue,” explains Roscoe. “That’s why I came to you instead of letting the rumor spread.” May takes a breath and gives Roscoe a meaningful look. Roscoe is a true friend, and May is thankful for his honesty. Together, May and Roscoe squash this untrue rumor and unlock the truth once and for all."],text:`The Unkind Rumor

Today, Roscoe uncovered an unkind rumor about his friend, May. He wanted to find out the truth, so he went to speak to her directly.

When he asked her about the rumor, May exclaimed, “That is untrue! Where in the world did you hear such an unreal statement? Be honest, Roscoe!” Roscoe was unable to uncover where he had heard this hurtful tale. “Do you truly think this about me?” asks May. “Are you spreading this around town? This makes me very unhappy!”

“I did not trust what I was told. I think it is untrue,” explains Roscoe. “That’s why I came to you instead of letting the rumor spread.” May takes a breath and gives Roscoe a meaningful look. Roscoe is a true friend, and May is thankful for his honesty. Together, May and Roscoe squash this untrue rumor and unlock the truth once and for all.`},{id:"107",title:"Fritz and Nibs",concept:"Doubling Rule -ed, -ing",sourcePage:80,paragraphs:["Fritz and Nibs are Kate’s best friends. In the morning, you can find the dogs napping on their padded beds. When they see Kate filling up their bowls with food, they come running. As they gobble up the kibble, their tails are wagging, and they have a half-lidded gaze. They like to eat!","In the afternoon, Fritz and Nibs spend time napping and wait for Kate to come home from class. When she opens the door, they come whizzing over to her with glee. They give Kate lots of kisses and she gives them lots of belly scratches.","In the evening, Kate feeds the dogs again. Then, she plays fetch with them, only stopping when it is time to do homework. Fritz and Nibs keep Kate very busy. She loves spending lots of time with her dogs because they are her best friends."],text:`Fritz and Nibs

Fritz and Nibs are Kate’s best friends. In the morning, you can find the dogs napping on their padded beds. When they see Kate filling up their bowls with food, they come running. As they gobble up the kibble, their tails are wagging, and they have a half-lidded gaze. They like to eat!

In the afternoon, Fritz and Nibs spend time napping and wait for Kate to come home from class. When she opens the door, they come whizzing over to her with glee. They give Kate lots of kisses and she gives them lots of belly scratches.

In the evening, Kate feeds the dogs again. Then, she plays fetch with them, only stopping when it is time to do homework. Fritz and Nibs keep Kate very busy. She loves spending lots of time with her dogs because they are her best friends.`},{id:"108",title:"David and Poppy",concept:"Doubling Rule -er, -est",sourcePage:81,paragraphs:["David is just like his grandfather, Poppy. When Poppy was a kid, he batted for his baseball team. David is batting for his team now. When Poppy was a kid, he was known for running the fastest on his team. Now, David is the fastest runner on his team. Poppy was thinner than all the other players on his team but always wanted to be bigger. David is slimmer than the other players but wishes he was the biggest too! When Poppy gets angry, his cheeks always turn red. When David gets angry, his cheeks turn even redder than Poppy’s!","Today, Poppy and David love to play baseball together. Poppy even built a batting cage in his yard to use when David visits. They talk about building an even bigger one together next summer. When they play baseball together, they practice pitching. David always flatters Poppy by saying Poppy throws the fastest pitches. Poppy smiles knowing that one day David’s pitches will be faster than his."],text:`David and Poppy

David is just like his grandfather, Poppy. When Poppy was a kid, he batted for his baseball team. David is batting for his team now. When Poppy was a kid, he was known for running the fastest on his team. Now, David is the fastest runner on his team. Poppy was thinner than all the other players on his team but always wanted to be bigger. David is slimmer than the other players but wishes he was the biggest too! When Poppy gets angry, his cheeks always turn red. When David gets angry, his cheeks turn even redder than Poppy’s!

Today, Poppy and David love to play baseball together. Poppy even built a batting cage in his yard to use when David visits. They talk about building an even bigger one together next summer. When they play baseball together, they practice pitching. David always flatters Poppy by saying Poppy throws the fastest pitches. Poppy smiles knowing that one day David’s pitches will be faster than his.`},{id:"109",title:"Heaven’s Skating Gift",concept:"Drop-e rule",sourcePage:82,paragraphs:["Heaven has always dreamed of being an ice skater. The closest she has been to skating is dancing. She has danced her entire life but has never had the chance to put on ice skates and get in a rink.","On the morning of Heaven’s birthday, her mom woke her up extra early. “Happy birthday, Heaven!” she shouted. Heaven was still sleepy and a bit startled but slowly awoke. “Here,” mom said as she handed Heaven a card, “open your gift.” Heaven sat up, rubbed her eyes, and slowly opened her card. As Heaven read her card she gasped then smiled. “Skating lessons!” she squealed with delight. This was the nicest gift Heaven had ever gotten.","That afternoon, Heaven found herself at the skating rink for the very first time. She felt a bit timid at first and hoped she would meet a new skating friend. As she sat on the bench to put on her skates, the nicest girl sat beside her. They chatted and joked and soon Heaven felt braver.","Her ice-skating lesson went well. Heaven felt like she was dancing as she sliced across the rink. She loved that feeling. When the lesson was over Heaven hugged and thanked her mom. She would not have traded this gift for anything."],text:`Heaven’s Skating Gift

Heaven has always dreamed of being an ice skater. The closest she has been to skating is dancing. She has danced her entire life but has never had the chance to put on ice skates and get in a rink.

On the morning of Heaven’s birthday, her mom woke her up extra early. “Happy birthday, Heaven!” she shouted. Heaven was still sleepy and a bit startled but slowly awoke. “Here,” mom said as she handed Heaven a card, “open your gift.” Heaven sat up, rubbed her eyes, and slowly opened her card. As Heaven read her card she gasped then smiled. “Skating lessons!” she squealed with delight. This was the nicest gift Heaven had ever gotten.

That afternoon, Heaven found herself at the skating rink for the very first time. She felt a bit timid at first and hoped she would meet a new skating friend. As she sat on the bench to put on her skates, the nicest girl sat beside her. They chatted and joked and soon Heaven felt braver.

Her ice-skating lesson went well. Heaven felt like she was dancing as she sliced across the rink. She loved that feeling. When the lesson was over Heaven hugged and thanked her mom. She would not have traded this gift for anything.`},{id:"110",title:"Hobbies",concept:"Y to I Rule",sourcePage:83,paragraphs:["Do you know what a hobby is? Hobbies are activities you do just for fun. Hobbies can be anything like sports, games, music, or crafts. Next time you are even the tiniest bit bored, consider trying a new hobby.","My friend Everly has a ton of hobbies. She likes to play the piano, ride her bike, and read books. Everly is happiest when she gets to spend time on her hobbies.","When Everly plays her piano, she likes to pretend that she is a rock star in front of a huge crowd. She can even hear the cries of applause from her fans.","On the sunniest days, Everly rides her bike on trails. Most of the time she invites her buddies to join her. They like the bumpiest trails the best and race to see who is the fastest.","On days it is a bit cloudier, Everly likes to read. She finds her fluffiest blanket, makes herself a yummy snack, and curls up with a good book.","Everly’s hobbies make her happier. She says the key to finding a good hobby is picking something you love doing just for fun and just for yourself. What kind of hobby would you like to try?"],text:`Hobbies

Do you know what a hobby is? Hobbies are activities you do just for fun. Hobbies can be anything like sports, games, music, or crafts. Next time you are even the tiniest bit bored, consider trying a new hobby.

My friend Everly has a ton of hobbies. She likes to play the piano, ride her bike, and read books. Everly is happiest when she gets to spend time on her hobbies.

When Everly plays her piano, she likes to pretend that she is a rock star in front of a huge crowd. She can even hear the cries of applause from her fans.

On the sunniest days, Everly rides her bike on trails. Most of the time she invites her buddies to join her. They like the bumpiest trails the best and race to see who is the fastest.

On days it is a bit cloudier, Everly likes to read. She finds her fluffiest blanket, makes herself a yummy snack, and curls up with a good book.

Everly’s hobbies make her happier. She says the key to finding a good hobby is picking something you love doing just for fun and just for yourself. What kind of hobby would you like to try?`}],k={lastText:"readAlong:lastText",textColor:"readAlong:textColor",backgroundColor:"readAlong:backgroundColor",highlightBgColor:"readAlong:highlightBgColor",highlightTextColor:"readAlong:highlightTextColor",fontSize:"readAlong:fontSize",wordSpacing:"readAlong:wordSpacing",characterSpacing:"readAlong:characterSpacing",lineSpacing:"readAlong:lineSpacing",minimapVisible:"readAlong:minimapVisible",minimapSide:"readAlong:minimapSide",minimapDefaultsVersion:"readAlong:minimapDefaults:v2",showLeadingWord:"readAlong:showLeadingWord"},yt=`This is an example text.

Use the arrow keys to move the highlight through the words. Hold Shift with the left or right arrow to move letter by letter, and adjust settings using the sidebar.

Click any word to jump to it. The active word remains centred as you progress.`,I={textColor:"#ffffff",backgroundColor:"#000000",highlightBgColor:"#003366",highlightTextColor:"#ffffff",fontSize:36,wordSpacing:0,characterSpacing:0,lineSpacing:1.6,minimapVisible:!0,minimapSide:"left",showLeadingWord:!0},it=[{inputId:"text-color",cssProperty:"--text-color",storageKey:k.textColor,fallback:I.textColor},{inputId:"background-color",cssProperty:"--background-color",storageKey:k.backgroundColor,fallback:I.backgroundColor},{inputId:"highlight-bg-color",cssProperty:"--highlight-bg-color",storageKey:k.highlightBgColor,fallback:I.highlightBgColor},{inputId:"highlight-text-color",cssProperty:"--highlight-text-color",storageKey:k.highlightTextColor,fallback:I.highlightTextColor}],h=e=>{const t=document.getElementById(e);if(!t)throw new Error(`Missing #${e}`);return t},i=h("text-container"),O=h("sidebar"),ce=h("sidebar-toggle"),bt=h("sidebar-close"),C=h("fullscreen-toggle"),Pe=h("fullscreen-status"),L=h("text-input"),Tt=h("ufli-open"),vt=h("ufli-supplemental-open"),W=h("ufli-dialog"),Be=h("ufli-grid"),Le=h("text-status"),q=h("font-size-range"),Q=h("font-size-number"),Te=h("word-spacing-range"),It=h("word-spacing-value"),ve=h("character-spacing-range"),xt=h("character-spacing-value"),Ie=h("line-spacing-range"),St=h("line-spacing-value"),T=h("minimap"),_e=h("minimap-content"),je=h("minimap-viewport"),ge=h("minimap-visible"),pe=h("minimap-side"),xe=h("show-leading-word"),b=h("colour-popover"),Wt=h("colour-popover-title"),Ht=h("colour-popover-done"),A=h("colour-field"),Xe=h("colour-field-cursor"),Je=h("colour-hue"),_=h("colour-saturation"),Ge=h("colour-brightness"),x=h("colour-hex"),Se=Array.from(document.querySelectorAll(".colour-trigger"));let g=[],J=[],me=[],le=-1,K=-1,Ne=-1,ue=-1,$=0,X=!1,R=null,H=null,Fe="",he=null,ze=[],fe="",U=null,E=null;const Z=5e3,Ae=512;let d=0,y=0,j=null,Ye=null,de=null,Ee=!1,G=null,ke=null,ee=null,V=0,N=0,F=1;function we(){Le.textContent=X?"Preparing text…":Fe,Le.hidden=!Le.textContent}function Oe(){H!==null&&clearTimeout(H),H=null;try{localStorage.setItem(k.lastText,L.value),Fe=""}catch{Fe="This text could not be saved in your browser. Keep a copy before closing the page."}we()}function P(e,t){try{localStorage.setItem(e,t)}catch{}}const re=(e,t,a,n)=>{const s=Number.parseFloat(localStorage.getItem(e)??"");return Number.isFinite(s)?Math.min(n,Math.max(a,s)):t},De=e=>e.toFixed(2).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1"),B=(e,t=0,a=1)=>Math.min(a,Math.max(t,e)),ae=e=>{const t=e.trim().replace(/^#/,"");return/^[0-9a-f]{6}$/i.test(t)?`#${t.toUpperCase()}`:null},ht=e=>{const t=ae(e)??"#000000",a=Number.parseInt(t.slice(1,3),16)/255,n=Number.parseInt(t.slice(3,5),16)/255,s=Number.parseInt(t.slice(5,7),16)/255,o=Math.max(a,n,s),f=Math.min(a,n,s),r=o-f;let u=0;return r>0&&(o===a?u=60*((n-s)/r%6):o===n?u=60*((s-a)/r+2):u=60*((a-n)/r+4)),u<0&&(u+=360),{hue:u,saturation:o===0?0:r/o,brightness:o}},Ct=(e,t,a)=>{const n=(e%360+360)%360,s=a*t,o=s*(1-Math.abs(n/60%2-1)),f=a-s;let r=0,u=0,w=0;return n<60?[r,u]=[s,o]:n<120?[r,u]=[o,s]:n<180?[u,w]=[s,o]:n<240?[u,w]=[o,s]:n<300?[r,w]=[o,s]:[r,w]=[s,o],`#${[r,u,w].map(p=>Math.round((p+f)*255).toString(16).padStart(2,"0")).join("")}`.toUpperCase()},Mt=(e,t)=>{const a=Se.find(s=>s.dataset.colourFor===e);if(!a)return;a.querySelector(".colour-trigger-swatch")?.style.setProperty("--swatch-colour",t);const n=a.querySelector("output");n&&(n.value=t),a.setAttribute("aria-label",`Choose ${a.dataset.colourLabel??"colour"}, currently ${t}`)},qe=(e,t)=>{const a=ae(t),n=it.find(o=>o.inputId===e);if(!a||!n)return!1;const s=h(e);return s.value=a,document.documentElement.style.setProperty(n.cssProperty,a),P(n.storageKey,a),Mt(e,a),!0},Ve=()=>{b.style.setProperty("--picker-hue",String(V)),Je.value=String(Math.round(V)),_.value=String(Math.round(N*100)),Ge.value=String(Math.round(F*100)),Xe.style.left=`${N*100}%`,Xe.style.top=`${(1-F)*100}%`},We=()=>{if(!G)return;const e=Ct(V,N,F);qe(G.id,e),x.value=e,x.removeAttribute("aria-invalid"),Ve()},ye=()=>{if(!ke||!b.matches(":popover-open"))return;const e=ke.getBoundingClientRect(),t=b.getBoundingClientRect(),a=8,n=7,s=B(e.right-t.width,a,Math.max(a,window.innerWidth-t.width-a)),o=e.bottom+n,f=o+t.height<=window.innerHeight-a?o:e.top-t.height-n,r=B(f,a,Math.max(a,window.innerHeight-t.height-a));b.style.left=`${s}px`,b.style.top=`${r}px`},Pt=e=>{const t=e.dataset.colourFor;if(!t)return;const a=h(t),n=ht(a.value);G=a,ke=e,V=n.hue,N=n.saturation,F=n.brightness,Wt.textContent=e.dataset.colourLabel??"Choose colour",x.value=ae(a.value)??"#000000",x.removeAttribute("aria-invalid"),Se.forEach(s=>s.setAttribute("aria-expanded",String(s===e))),Ve(),b.matches(":popover-open")?(ye(),_.focus({preventScroll:!0})):(b.style.visibility="hidden",b.showPopover(),requestAnimationFrame(()=>{ye(),b.style.visibility="visible",_.focus({preventScroll:!0})}))},Ze=e=>{const t=A.getBoundingClientRect();N=B((e.clientX-t.left)/Math.max(1,t.width)),F=1-B((e.clientY-t.top)/Math.max(1,t.height)),We()},He=e=>{O.classList.toggle("open",e),O.setAttribute("aria-hidden",String(!e)),ce.setAttribute("aria-expanded",String(e)),ce.setAttribute("aria-label",e?"Close settings":"Open settings"),!e&&b.matches(":popover-open")&&b.hidePopover()},Ue=()=>{const e=ge.checked,t=pe.value==="left"?"left":"right";T.hidden=!e,T.className=t,i.classList.toggle("minimap-visible",e),i.classList.toggle("minimap-left",e&&t==="left"),i.classList.toggle("minimap-right",e&&t==="right"),P(k.minimapVisible,String(e)),P(k.minimapSide,t),z()},dt=()=>{P(k.showLeadingWord,String(xe.checked)),Ce()},te=()=>{E!==null&&clearTimeout(E),E=null;const e=Math.min(120,Math.max(12,Number.parseFloat(q.value)||I.fontSize)),t=Number.parseFloat(Te.value)||0,a=Number.parseFloat(ve.value)||0,n=Number.parseFloat(Ie.value)||I.lineSpacing;q.value=String(e),Q.value=String(e),It.value=`${De(t)} em`,xt.value=`${De(a)} em`,St.value=`${De(n)}×`,i.style.fontSize=`${e}px`,i.style.wordSpacing=`${t}em`,i.style.letterSpacing=`${a}em`,i.style.lineHeight=String(n),P(k.fontSize,String(e)),P(k.wordSpacing,String(t)),P(k.characterSpacing,String(a)),P(k.lineSpacing,String(n)),z(),requestAnimationFrame(Me)},ne=()=>{E!==null&&clearTimeout(E),g.length>Z?E=window.setTimeout(te,120):te()};function Bt(){L.value=localStorage.getItem(k.lastText)??yt,it.forEach(({inputId:t,storageKey:a,fallback:n})=>{qe(t,localStorage.getItem(a)??n)}),q.value=String(re(k.fontSize,I.fontSize,12,120)),Te.value=String(re(k.wordSpacing,I.wordSpacing,0,2)),ve.value=String(re(k.characterSpacing,I.characterSpacing,0,.25)),Ie.value=String(re(k.lineSpacing,I.lineSpacing,1,3)),localStorage.getItem(k.minimapDefaultsVersion)!=="2"?(ge.checked=I.minimapVisible,pe.value=I.minimapSide,P(k.minimapDefaultsVersion,"2")):(ge.checked=localStorage.getItem(k.minimapVisible)!=="false",pe.value=localStorage.getItem(k.minimapSide)==="right"?"right":I.minimapSide);const e=localStorage.getItem(k.showLeadingWord);xe.checked=e===null?I.showLeadingWord:e==="true",te(),Ue(),dt()}async function be(e){const t=++$;X=!0,i.setAttribute("aria-busy","true"),we(),L.spellcheck=e.length<2e4;const a=[],n=[],s=[],o=document.createDocumentFragment();let f=performance.now();if(e)for(const r of e.replace(/\r\n?/g,`
`).split(`
`)){const u=document.createElement("p"),w=a.length;if(!r.trim())u.className="empty-line",u.append(document.createElement("br"));else{const p=r.trim().split(/\s+/);for(let m=0;m<p.length;m++){const c=p[m],l=document.createElement("span");if(l.className="word",l.textContent=c,l.dataset.index=String(a.length),u.append(l),m<p.length-1&&u.append(document.createTextNode(" ")),a.push(l),n.push(c),a.length%128===0&&performance.now()-f>=8){if(await new Promise(v=>setTimeout(v,0)),t!==$)return;f=performance.now()}}}if(o.append(u),s.push({element:u,startWordIndex:w,endWordIndex:a.length-1,characters:r.trim().length}),performance.now()-f>=8){if(await new Promise(p=>setTimeout(p,0)),t!==$)return;f=performance.now()}}t===$&&(se(),g=a,J=n,me=s,i.replaceChildren(o),i.classList.toggle("large-document",g.length>Z),fe="",le=K=ue=-1,Ne=-1,d=Math.min(d,Math.max(0,g.length-1)),y=S(d).length,X=!1,i.setAttribute("aria-busy","false"),we(),rt(),Ce(),Me(),z())}function S(e){return Array.from(J[e]??"")}function Lt(e,t){const a=S(t),n=t<d||t===d&&y>=a.length;if(e.classList.toggle("highlighted",n),t!==d||y<=0||n){e.firstElementChild&&e.replaceChildren(J[t]??"");return}const s=document.createElement("span");s.className="character-highlighted",s.textContent=a.slice(0,y).join(""),e.replaceChildren(s,a.slice(y).join(""))}function Ce(){const e=y<S(d).length,t=d-(e?1:0);for(let n=Math.min(le,t)+1;n<=Math.max(le,t);n++)g[n]?.classList.toggle("highlighted",n<=t);if(le=t,K!==d){const n=g[K];n?.firstElementChild&&n.replaceChildren(J[K])}if(K!==d||Ne!==y){const n=g[d];n&&Lt(n,d),K=d,Ne=y}let a=-1;if(xe.checked)for(a=e?d:d+1;a<g.length&&Ke(J[a]);)a+=1;a!==ue&&(g[ue]?.classList.remove("leading-word"),g[a]?.classList.add("leading-word"),ue=a),lt()}function Ke(e){return/^[.,;:!?]+$/.test(e)}function se(){j!==null&&cancelAnimationFrame(j),j=null,Ye=null}function At(e,t,a){Ye=t;const n=()=>{const r=Ye?.()??e.scrollTop,u=Math.max(0,e.scrollHeight-e.clientHeight);return Math.min(u,Math.max(0,r))};if(kt()){const r=n();se(),e.scrollTop=r;return}if(j!==null)return;let s=performance.now(),o=0;const f=r=>{const u=n(),w=u-e.scrollTop;if(Math.abs(w)<=1){e.scrollTop=u,o++,j=o<3?requestAnimationFrame(f):null;return}o=0;const p=Math.max(0,r-s);s=r;const m=Math.abs(w)*(1-Math.exp(-p/(a/4)));e.scrollTop+=Math.sign(w)*Math.min(Math.abs(w),Math.max(1,m)),j=requestAnimationFrame(f)};j=requestAnimationFrame(f)}function et(){const e=g[d];if(!e)return i.scrollTop;g.length>Z&&e.parentElement!==U&&(U?.style.removeProperty("content-visibility"),U=e.parentElement,U&&(U.style.contentVisibility="visible"));const t=e.offsetTop,a=e.offsetHeight,n=i.clientHeight,s=Math.min(a,n*.15,Math.max(0,(n-a)/2));return t<i.scrollTop+s?i.scrollTop=Math.max(0,t-s):t+a>i.scrollTop+n-s&&(i.scrollTop=t+a-n+s),t-n/2+a/2}function Me(){g[d]&&(et(),At(i,et,320))}function rt(){if(g.length<=Z)return;const e=getComputedStyle(i),t=Math.max(1,i.clientWidth-parseFloat(e.paddingLeft)-parseFloat(e.paddingRight)),a=`${t}|${e.font}|${e.letterSpacing}|${e.wordSpacing}|${e.lineHeight}`;if(a===fe)return;fe=a;const n=document.createElement("canvas").getContext("2d");n&&(n.font=e.font);const s="The reader walked through the quiet village.",o=(n?.measureText(s).width??s.length*parseFloat(e.fontSize)*.5)/s.length,f=parseFloat(e.letterSpacing)||0,r=parseFloat(e.wordSpacing)||0,u=parseFloat(e.lineHeight);for(const w of me){const p=Math.max(0,w.endWordIndex-w.startWordIndex+1),m=w.characters*(o+f)+p*r,c=Math.max(1,Math.ceil(m/(t*.9)))*u;w.element.style.containIntrinsicSize=`auto ${c}px`}}function z(){he!==null&&clearTimeout(he),he=window.setTimeout(()=>{he=null,de!==null&&cancelAnimationFrame(de),de=requestAnimationFrame(()=>{de=null,!X&&(rt(),Dt())})},120)}function Dt(){if(T.hidden)return;const e=getComputedStyle(i),t=parseFloat(e.paddingLeft),a=Math.max(1,i.clientWidth-t-parseFloat(e.paddingRight)),n=i.getBoundingClientRect(),s=n.left+t;let o=[];if(g.length>Z){const p=me.filter(l=>l.endWordIndex>=l.startWordIndex).map(l=>({...l,top:l.element.offsetTop,height:l.element.offsetHeight})),m=Math.max(1,Math.ceil(g.length/Ae));let c=0;for(let l=0;l<g.length;l+=m){for(;c+1<p.length&&l>p[c].endWordIndex;)c++;const v=p[c];if(!v)break;const oe=(l-v.startWordIndex)/Math.max(1,v.endWordIndex-v.startWordIndex+1);o.push({leftRatio:0,widthRatio:.9,densityRatio:.9,documentTop:v.top+oe*v.height,startWordIndex:l,endWordIndex:Math.min(g.length-1,l+m-1)})}T.dataset.layoutEngine="paragraph-overview"}else{for(const p of me){const m=new Map;for(let c=p.startWordIndex;c<=p.endWordIndex;c++)for(const l of g[c].getClientRects()){if(l.width<=0||l.height<=0)continue;const v=l.top-n.top+i.scrollTop,oe=Math.round(v*2)/2,Y=m.get(oe);Y?(Y.left=Math.min(Y.left,l.left),Y.right=Math.max(Y.right,l.right),Y.end=c):m.set(oe,{left:l.left,right:l.right,top:v,start:c,end:c})}for(const c of m.values()){const l=B((c.left-s)/a),v=Math.min(1-l,(c.right-c.left)/a);o.push({leftRatio:l,widthRatio:v,densityRatio:v,documentTop:c.top,startWordIndex:c.start,endWordIndex:c.end})}}T.dataset.layoutEngine="dom"}if(o.length>Ae){const p=Math.ceil(o.length/Ae),m=[];for(let c=0;c<o.length;c+=p)m.push({...o[c],endWordIndex:o[Math.min(o.length-1,c+p-1)].endWordIndex});o=m}const f=document.createDocumentFragment(),r=Math.max(1,_e.clientHeight),u=Math.max(1,i.scrollHeight),w=Math.min(6,Math.max(1,r/Math.max(1,o.length)*.48));ze=[];for(const p of o){const m=document.createElement("span");m.className="minimap-line",m.style.top=`${B(p.documentTop/u*r,0,r-w)}px`,m.style.left=`${p.leftRatio*100}%`,m.style.width=`${Math.max(5,p.widthRatio*100)}%`,m.style.height=`${w}px`,f.append(m),ze.push({element:m,start:p.startWordIndex,end:p.endWordIndex,progress:-1})}_e.replaceChildren(f),lt(),ut()}function lt(){if(T.hidden)return;const e=y/Math.max(1,S(d).length);for(const t of ze){const a=B((d-t.start+e)/Math.max(1,t.end-t.start+1));a!==t.progress&&(t.progress=a,t.element.style.setProperty("--read-progress",`${a*100}%`),t.element.classList.toggle("read",a===1),t.element.classList.toggle("reading",a>0&&a<1))}}function ut(){if(T.hidden)return;const e=T.clientHeight,t=Math.max(0,i.scrollHeight-i.clientHeight),a=Math.min(1,i.clientHeight/Math.max(1,i.scrollHeight)),n=Math.min(e,Math.max(24,e*a)),s=t===0?0:i.scrollTop/t*(e-n);je.style.height=`${n}px`,je.style.transform=`translateY(${s}px)`}function ct(e){const t=T.getBoundingClientRect(),a=je.getBoundingClientRect().height,n=Math.max(1,t.height-a),s=Math.min(n,Math.max(0,e.clientY-t.top-a/2)),o=Math.max(0,i.scrollHeight-i.clientHeight);i.scrollTop=s/n*o}ce.addEventListener("click",()=>He(!O.classList.contains("open")));bt.addEventListener("click",()=>He(!1));function $e(e,t=!1){Be.replaceChildren(),Be.classList.toggle("supplemental-grid",t),h("ufli-title").textContent=t?"UFLI Supplemental Passages":"UFLI Decodable Texts",h("ufli-description").textContent=t?"Choose a passage to load its text. Some lessons have more than one passage.":"Choose a lesson number to load its text.",h("ufli-close").setAttribute("aria-label",t?"Close UFLI Supplemental Passages":"Close UFLI Decodable Texts");for(const a of e){const n=document.createElement("button");n.type="button",n.textContent=t?`Lesson ${a.id}: ${a.title}`:a.id,n.title=`Lesson ${a.id}: ${a.title}`,n.addEventListener("click",()=>{R!==null&&clearTimeout(R),H!==null&&clearTimeout(H),R=null,H=null,L.value=a.text,d=0,y=0,Oe(),be(a.text),W.close(),He(!1),i.focus({preventScroll:!0})}),Be.append(n)}}$e(ot);Tt.addEventListener("click",()=>{$e(ot),b.matches(":popover-open")&&b.hidePopover(),W.showModal()});vt.addEventListener("click",()=>{$e(wt,!0),b.matches(":popover-open")&&b.hidePopover(),W.showModal()});h("ufli-close").addEventListener("click",()=>W.close());W.addEventListener("click",e=>{if(e.target!==W)return;const t=W.getBoundingClientRect();(e.clientX<t.left||e.clientX>t.right||e.clientY<t.top||e.clientY>t.bottom)&&W.close()});function Rt(){const e=!!document.fullscreenElement,t=e?"Exit fullscreen":"Enter fullscreen";C.setAttribute("aria-label",t),C.setAttribute("aria-pressed",String(e)),C.title=t,C.querySelector(".fullscreen-enter")?.toggleAttribute("hidden",e),C.querySelector(".fullscreen-exit")?.toggleAttribute("hidden",!e)}C.disabled=!document.fullscreenEnabled;C.disabled&&(C.title="Fullscreen is not available in this browser");document.addEventListener("fullscreenchange",Rt);C.addEventListener("click",async()=>{Pe.hidden=!0;try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen()}catch{Pe.textContent="Fullscreen could not be changed. Please try again.",Pe.hidden=!1}});document.addEventListener("pointerdown",e=>{if(!O.classList.contains("open"))return;const t=e.target;t instanceof Node&&(O.contains(t)||ce.contains(t)||b.contains(t)||W.open||He(!1))});L.addEventListener("input",()=>{++$,R!==null&&clearTimeout(R),H!==null&&clearTimeout(H);const e=L.value;L.spellcheck=e.length<2e4,H=window.setTimeout(Oe,700),e.length>=2e4?(X=!0,i.setAttribute("aria-busy","true"),we(),R=window.setTimeout(()=>{R=null,be(e)},150)):be(e)});window.addEventListener("pagehide",()=>{H!==null&&Oe()});i.addEventListener("click",e=>{const t=e.target;if(!(t instanceof Element))return;const a=t.closest(".word");!a||!i.contains(a)||(d=Number(a.dataset.index),y=S(d).length,Ce(),Me())});q.addEventListener("input",ne);Q.addEventListener("input",()=>{Q.value&&(q.value=Q.value,ne())});Q.addEventListener("change",te);Te.addEventListener("input",ne);ve.addEventListener("input",ne);Ie.addEventListener("input",ne);for(const e of[q,Te,ve,Ie])e.addEventListener("change",te);Se.forEach(e=>{e.setAttribute("aria-expanded","false"),e.addEventListener("click",()=>Pt(e))});b.addEventListener("toggle",()=>{b.matches(":popover-open")||(Se.forEach(e=>e.setAttribute("aria-expanded","false")),ee=null)});Ht.addEventListener("click",()=>{const e=ke;b.hidePopover(),e?.focus()});A.addEventListener("pointerdown",e=>{ee=e.pointerId,A.setPointerCapture(e.pointerId),Ze(e)});A.addEventListener("pointermove",e=>{ee===e.pointerId&&Ze(e)});const gt=e=>{ee===e.pointerId&&(e.type==="pointerup"&&Ze(e),A.hasPointerCapture(e.pointerId)&&A.releasePointerCapture(e.pointerId),ee=null)};A.addEventListener("pointerup",gt);A.addEventListener("pointercancel",gt);Je.addEventListener("input",()=>{V=Number.parseFloat(Je.value)||0,We()});_.addEventListener("input",()=>{N=B((Number.parseFloat(_.value)||0)/100),We()});Ge.addEventListener("input",()=>{F=B((Number.parseFloat(Ge.value)||0)/100),We()});x.addEventListener("input",()=>{const e=ae(x.value);if(!e||!G){x.setAttribute("aria-invalid","true");return}const t=ht(e);V=t.hue,N=t.saturation,F=t.brightness,x.value=e,x.removeAttribute("aria-invalid"),qe(G.id,e),Ve()});x.addEventListener("change",()=>{!ae(x.value)&&G&&(x.value=G.value,x.removeAttribute("aria-invalid"))});ge.addEventListener("change",Ue);pe.addEventListener("change",Ue);xe.addEventListener("change",dt);i.addEventListener("scroll",()=>{ut(),g.length>Z&&!T.hidden&&z()},{passive:!0});i.addEventListener("wheel",se,{passive:!0});i.addEventListener("pointerdown",se,{passive:!0});T.addEventListener("pointerdown",e=>{se(),Ee=!0,T.setPointerCapture(e.pointerId),ct(e)});T.addEventListener("pointermove",e=>{Ee&&ct(e)});T.addEventListener("pointerup",e=>{Ee=!1,T.releasePointerCapture(e.pointerId)});function tt(e){const t=S(d).length;if(e>0){y<t?y+=1:d<g.length-1&&(d+=1,y=Math.min(1,S(d).length));return}y>0?y-=1:d>0&&(d-=1,y=Math.max(0,S(d).length-1))}document.addEventListener("keydown",e=>{if(!(W.open||e.target.matches("input, textarea, select, button"))&&g[d]){if(e.key==="ArrowRight")if(e.shiftKey)tt(1);else{let a=d+1;for(;a<g.length&&Ke(J[a]);)a+=1;a<g.length&&(d=a,y=S(d).length)}else if(e.key==="ArrowLeft")if(e.shiftKey)tt(-1);else{let a=d-1;for(;a>=0&&Ke(J[a]);)a-=1;a>=0&&(d=a,y=S(d).length)}else if(e.key==="ArrowUp"||e.key==="ArrowDown"){const a=g[d].offsetTop,n=e.key==="ArrowUp"?-1:1;for(let s=d+n;s>=0&&s<g.length;s+=n)if(n<0&&g[s].offsetTop<a||n>0&&g[s].offsetTop>a){d=s,y=S(d).length;break}}else return;Ce(),Me(),e.preventDefault()}});window.addEventListener("resize",()=>{z(),ye()});O.addEventListener("scroll",ye,{passive:!0});const jt=new ResizeObserver(z);jt.observe(i);window.addEventListener("load",()=>{Bt(),be(L.value),document.fonts.ready.then(()=>{fe="",z()})});
