local list = KEYS[1]
local channel = ARGV[1]
local commit = ARGV[2]
local repo_name = ARGV[3]
local time = ARGV[4]
if redis.call("EXISTS", commit) == 1 then
    return redis.error_reply("Commit already exists")
end

redis.call("HMSET", commit, "repo_name", repo_name, "time", time)

redis.call("LPUSH", list, commit)
redis.call("PUBLISH", channel, "inserted_to_incoming")
return redis.status_reply("OK")
