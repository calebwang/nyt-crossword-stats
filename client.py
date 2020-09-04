from datetime import datetime, timedelta
import calendar
import requests
import json
import http.cookiejar
from enum import Enum

DATE_FORMAT = "%Y-%m-%d"
UID = "77239038"
ARCHIVE_URL = "https://nyt-games-prd.appspot.com/svc/crosswords/v3/{uid}/puzzles.json?publish_type=daily&sort_order=asc&sort_by=print_date&date_start={start_date}&date_end={end_date}"
GAME_URL = "https://nyt-games-prd.appspot.com/svc/crosswords/v6/game/{gid}.json"

class PuzzleStatus(Enum):
    DONE = 1
    IN_PROGRESS = 2
    NOT_STARTED = 3

class Puzzle(object):
    def __init__(self, pid, status):
        self.id = pid
        self.status = status
        self.time = None

class NYTCrosswordClient(object):
    def __init__(self, user_id):
        self.user_id = str(user_id)
        self.nyts_value = self._nyts_value()
        self.games = dict()

    def _nyts_value(self):
        cj = http.cookiejar.MozillaCookieJar()
        cj.load("cookies.txt")
        nyts_cookie = next(
            (cookie for cookie in cj
            if cookie.name == "NYT-S")
        )
        return nyts_cookie.value

    def _load_range_summary(self, start_date, end_date):
        url = ARCHIVE_URL.format(
                uid=self.user_id,
                start_date=start_date.strftime(DATE_FORMAT),
                end_date=end_date.strftime(DATE_FORMAT),
        )
        res = requests.get(url)
        # TODO: Write custom JSON parser to parse into classes
        data = json.loads(res.content)
        puzzles = data["results"]
        for puzzle in puzzles:
            puzzle_d = datetime.strptime(puzzle["print_date"], DATE_FORMAT)
            puzzle_id = puzzle["puzzle_id"]
            puzzle_status = PuzzleStatus.DONE if puzzle["solved"] else PuzzleStatus.IN_PROGRESS if puzzle["percent_filled"] > 0 else PuzzleStatus.NOT_STARTED
            self.games[puzzle_d] = Puzzle(puzzle_id, puzzle_status)

    def month_summary(self, year, month):
        month_start = datetime(year, month, 1)
        _, days_in_month = calendar.monthrange(year, month)
        month_end = month_start + timedelta(days_in_month - 1)
        self._load_range_summary(month_start, month_end)

        return date_generator(month_start, month_end)

    def day_stats(self, date):
        if date in self.games:
            return self.games[date]
        # TODO: Load underlying data here
        raise NotImplementedError()


    def game_stats(self, game_id):
        res = requests.get(GAME_URL.format(gid=game_id), headers = {
            "nyt-s": self.nyts_value
        })
        data = json.loads(res.content)
        return data["calcs"], data["firsts"] if "firsts" in data else None

def date_generator(start_date, end_date):
    current_date = start_date
    while current_date <= end_date:
        yield current_date
        current_date += timedelta(days=1)


