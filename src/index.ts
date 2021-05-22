import { _compileGcc } from './compile'
import { getTask } from './task'

getTask('aplusb').then(task => {
    console.log("Got! ", task)
}).catch(e => {
    console.log(e)
})