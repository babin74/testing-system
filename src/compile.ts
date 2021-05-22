const util = require('util')
const execFile = util.promisify(require('child_process').execFile)

const targetGcc = {
    "cc": "g++",
    "flags": ["-std=c++17", "-O2"]
};

const targetPython = {
    "int": "python3" // interpretator
}

async function _compileGcc(inputs: string[], output: string, flags?: string[]) {
    const params = targetGcc.flags.slice()
    inputs.forEach(x => params.push(x));
    params.push('-o')
    params.push(output)
    if (flags !== undefined) {
        flags.forEach(x => params.push(x))
    }

    console.log(targetGcc.cc, params)
    const { stdout } = await execFile(targetGcc.cc, params)
    return stdout
}

type ProgramType = "cpp" | "py3"

type ProgramInfo = {
    type: ProgramType
    path: string
}

async function invokeProgram(prog: ProgramInfo, flags?: string[]) {
    if (flags === undefined) flags = []

    switch (prog.type) {
        case "cpp": {
            const { stdout } = await execFile(prog, flags)
            return stdout
        }

        case "py3": {
            const pflags: string[] = [prog.path]
            flags.forEach(x => pflags.push(x))
            const { stdout } = await execFile(targetPython.int, pflags)
            return stdout
        }
    }
}

export {
    _compileGcc,
    ProgramInfo,
    ProgramType,
    invokeProgram,
}