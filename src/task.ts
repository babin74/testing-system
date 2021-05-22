const loadJsonFile = require('load-json-file')
import { createWriteStream, writeFileSync } from 'fs'
import { isTypeAliasDeclaration } from 'typescript'
import { _compileGcc, ProgramInfo, ProgramType, invokeProgram } from './compile'
import { getRandomFileName } from './util'

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
            let target = getRandomFileName()
            await _compileGcc([task.path + "src/" + src], target)
            task.fileMap.set(name, { path: target, type: "cpp" })
            break

        case "py3":
            task.fileMap.set(name, { path: task.path + "src/" + src, type: "py3" })
            break
        }

        console.log("EXIT")
    }
}

async function initTestCases(task: Task, tests: TestCase[]) {
    let count = 0
    for (let i = 0; i < tests.length; ++i) {
        console.log(JSON.stringify(tests[i]))

        switch(tests[i].kind) {
        case "generated": {
            const test = tests[i] as TestCaseGenerated

            const prog: ProgramInfo = task.fileMap.get(test.command[0])
            const args0: string[] = test.command.slice(1)

            for (let j = 1; j <= test.count; ++j) {
                const args = args0.map(x => x == "{id}" ? j.toString() : x)
                const out: string = await invokeProgram(prog, args)

                count++;
                const file = task.path + "generated/" + count + ".in"
                writeFileSync(file, out)
                task.generatedTests.push(file)
            }
        }   break

        case "single": {
            const test = tests[i] as TestCaseSingle
            task.generatedTests.push(test.name)
            count++;
        }   break
        }
    }
}

const taskInfo = new Map<string, Task>()

function initTask(task: Task) {
    task.status = "progress"

    console.log("Try to read " + (task.path + 'task.json'))

    let taskInfo = loadJsonFile(task.path + 'task.json').then(res => {
        const testingType: TestingType = res["details"].testing
        const scoreType: ScoringType = res["details"].score
        task.scoreType = scoreType
        task.testingType = testingType
        console.log(testingType)
        console.log(scoreType)
        
        return initGenerators(task, res["util"]).then(() => res)
    }).then((res) => {
        console.log("Init test cases...")
        return initTestCases(task, res["testcases"]).then(() => res)
    }).then((res) => {
        task.status = "completed"
    }).catch(e => {
        task.status = "failed"
    })
}

function getTask(name: string) {
    if (!taskInfo.has(name)) {
        taskInfo.set(name, {
            name, path: "./problems/" + name + "/", 
            status: "await",
            fileMap: new Map(),
            generatedTests: [],
        })
        initTask(taskInfo.get(name))
    }

    return new Promise((resolve, reject) => {
        const task = taskInfo.get(name)
        if (task.status == "completed") resolve(task)
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