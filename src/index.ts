import { configure, getLogger } from 'log4js'
import { _compileGcc } from './compile'
import { getTask } from './task'

configure("config/log4js_setting.json")
const logger = getLogger()

logger.info("Testing system server has been started!")

getTask('aplusb').then(task => {
    console.log("Got! ", task)
}).catch(e => {
    logger.fatal(e)
})