const loadJsonFile = require('load-json-file')
import { writeFileSync } from 'fs'
import { getLogger } from 'log4js'
import { _compileGcc, ProgramInfo, ProgramType, invokeProgram } from './compile'
import { getRandomFileName } from './util'

const logger = getLogger()

type TestingType = "file" | "interactive" | "chain"
type ScoringType = "binary" | "groups" | "special" | "test"
type TaskStatus = "completed" | "progress" | "await" | "failed"

type UtilProgram = {
    name: string
    src: string
    lang: ProgramType
}

type TestCaseSingle = {
    name: string
    kind: "single"

}

type TestCaseGenerated = {
    kind: "generated"
    command: string[]
    count: number
}

type TestCase = TestCaseSingle | TestCaseGenerated

type TaskDetails = {
    testing: TestingType
    score: ScoringType
}

type TaskDeclaration = {
    details: TaskDetails
    util: UtilProgram[]
    testcases: TestCase[]
}

type Task = {
    name : string, // Just a short identificator
    path: string,  // Path to task root directory
    status: TaskStatus,
    testingType?: TestingType,
    scoreType?:   ScoringType,
    fileMap: Map<string, ProgramInfo>,
    generatedTests: string[],
}

async function initGenerators(task: Task, gens: UtilProgram[]) {
    for (let i = 0; i < gens.length; ++i) {
        const { name, src, lang } = gens[i];
        switch (lang) {
        case "cpp":
            try { 
                let target = getRandomFileName()
                await _compileGcc([task.path + "src/" + src], target)
                task.fileMap.set(name, { path: target, type: "cpp" })
            } catch(e) {
                logger.error("Cannot compile '" + name + "' utility")
                throw e
            }
            break

        case "py3":
            task.fileMap.set(name, { path: task.path + "src/" + src, type: "py3" })
            break

        default:
            logger.error("Unknown utility program type -- " + lang + " (name = " + name + ")")
            throw "Unknown utility program type";
        }
    }
}

async function initTestCases(task: Task, tests: TestCase[]) {
    let count = 0
    for (let i = 0; i < tests.length; ++i) {
        switch(tests[i].kind) {
        case "generated": {
            const test = tests[i] as TestCaseGenerated

            const prog: ProgramInfo | undefined = task.fileMap.get(test.command[0])
            if (prog === undefined) throw "Generator " + test.command[0] + " doesn't exist";
            const args0: string[] = test.command.slice(1)

            const group = count;
            for (let j = 1; j <= test.count; ++j) {
                count++;
                const file = task.path + "generated/" + count + ".in"
                const args = args0.map(x => x == "{id}" ? j.toString() : x)
                let out: string = "";
                try {
                    out = await invokeProgram(prog, args)
                } catch(e) {
                    logger.error("Cannot generate test " + count + " at group " + (group+1) + ".." + (group+test.count) 
                               + ", gen is '" + test.command[0] + " " + args.join(" ") + "'")
                    throw e;
                }

                writeFileSync(file, out)
                task.generatedTests.push(file)
            }
        }   break

        case "single": {
            const test = tests[i] as TestCaseSingle
            task.generatedTests.push(test.name)
            count++;
        }   break

        default:
            logger.error("Unknown test type - " + tests[i].kind)
            throw "Unknown test type"
        }
    }
}

const taskInfo = new Map<string, Task>()

function initTask(task: Task) {
    task.status = "progress"

    logger.debug("Try to read " + (task.path + 'task.json'))

    let taskInfo = loadJsonFile(task.path + 'task.json').then((res: TaskDeclaration) => {
        const testingType: TestingType = res.details.testing
        const scoreType: ScoringType = res.details.score
        task.scoreType = scoreType
        task.testingType = testingType
        return initGenerators(task, res.util).then(() => res)
    }).then((res: TaskDeclaration) => {
        return initTestCases(task, res.testcases).then(() => res)
    }).then((_res: TaskDeclaration) => {
        logger.info("Initializing task " + task.name + " completed!")
        task.status = "completed"
    }).catch((_e: string) => {
        logger.warn("Initializing task " + task.name + " failed!")
        // console.log(_e)
        task.status = "failed"
    })
}

function getTask(name: string) {
    if (!taskInfo.has(name)) {
        const task: Task = {
            name, path: "./problems/" + name + "/", 
            status: "await",
            fileMap: new Map(),
            generatedTests: [],
        }

        taskInfo.set(name, task)
        initTask(task)
    }

    return new Promise((resolve, reject) => {
        const task = taskInfo.get(name)
        if (task === undefined) reject("Task " + name + " doesn't exist")
        else if (task.status == "completed") resolve(task)
        else if (task.status == "failed") reject("[ERROR] Failed to get task " + name)
        else {
            let iter = 0
            const timer = setInterval(() => {
                iter += 1
                if (task.status == "completed") {
                    resolve(task)
                    clearInterval(timer)
                }
                if (task.status == "failed") {
                    reject("[ERROR] Failed to get task " + name)   
                    clearInterval(timer)
                }

                if (iter === 10) {
                    reject("[ERROR] TL while loading task " + name) 
                    clearInterval(timer)
                }
            }, 1000)
        }
    })
}

export {
    getTask,
}