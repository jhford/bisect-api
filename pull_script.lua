local list = KEYS[1]
local commit = redis.call("LINDEX", list, -1)
local repo_name = nil
local time = nil

if redis.call("LLEN", list) < 1 then 
    return redis.error_reply("List empty")
end
if 
    redis.call("EXISTS", commit) == 1 and
    redis.call("HEXISTS", commit, "repo_name") == 1 and
    redis.call("HEXISTS", commit, "time") == 1
then
    repo_name = redis.call("HGET", commit, "repo_name")
    time = redis.call("HGET", commit, "time")
    local rv = {}
    rv["commit"] = commit
    rv["repo_name"] = repo_name
    rv["time"] = time
    if redis.call("DEL", commit) == 1 then
        if redis.call("RPOP", commit) ~= commit then
            return redis.error_reply("Error removing item from queue")
        end
    else
        return redis.error_reply("Unable to delete item from queue")
    end
    return cjson.encode(rv)
else
    return redis.error_reply("Invalid or missing hash for " .. commit)
end
