import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, combineLatest, BehaviorSubject, Observable } from 'rxjs';
import { map, debounce, debounceTime } from 'rxjs/operators';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-rtk',
  templateUrl: './rtk.component.html',
  styleUrls: ['./rtk.component.scss']
})
export class RtkComponent implements OnInit {

  constructor(private http: HttpClient,
    private breakpointObserver: BreakpointObserver) { }

  rtk = new BehaviorSubject<{ [id: number]: RTKSentence }>({});
  searchText = new BehaviorSubject<string>("");
  ignoreKanji = new BehaviorSubject<string>("彼今気来生長私間事"); // 彼女私友達男今気来生長間事食部人業
  small = new BehaviorSubject(false);

  showNoSentenceKanji = new BehaviorSubject<boolean>(false);
  showFurigana = new BehaviorSubject<boolean>(true);
  filteredSentences: Observable<Array<RTKSentence>>;
  resultLimit = new BehaviorSubject<number>(100);


  ngOnInit() {
    // for speed first load in all 


    // load rtk data
    let getrtk = this.http.get('assets/rtk.tsv', { responseType: 'text' });
    let getsentences = this.http.get('assets/sentences.tsv', { responseType: 'text' });



    this.breakpointObserver.observe([
      '(max-width: 1280px)'
    ]).subscribe(result => {
      if (result.matches) {
        this.small.next(false);
      } else {
        // if necessary:
        this.small.next(true);
      }
    });


    this.filteredSentences = combineLatest(
      getrtk,
      getsentences,
      this.showNoSentenceKanji.pipe(debounceTime(1000)),
      this.searchText.pipe(debounceTime(1000)),
      this.resultLimit.pipe(debounceTime(1000)),
      this.showFurigana,
      this.ignoreKanji.pipe(debounceTime(1000))
    ).pipe(
      map(([rtkdata, sentenceData, v, searchtext, resultLimit, showFurigana, ignorekanji]
      : [string, string, boolean, string, number, boolean, string]) => {

        // read rtk
        {
          console.log(rtkdata);

          var rows = rtkdata.split("\n");
          var rtk: { [id: number]: RTKSentence } = {}

          rows.forEach(srow => {
            var row = srow.split("\t");
            var n = <RTKSentence>{
              kanji: row[0],
              keyword: row[1],
              number: parseInt(row[2]),
              sentences: []
            };


            // exclude if in the mix
            if ((ignorekanji).indexOf(n.kanji) == -1) {
              rtk[n.number] = n;
            }

          })
        }


        // read sentences
        {
          console.log(sentenceData);

          var sebrows = sentenceData.split("\n");
          // for some reason the last sentence is broken.
          sebrows.pop();

          sebrows.forEach(srow => {
            var row = srow.split("\t");
            var ncs = <CoreSentence>{
              coreIndex: parseInt(row[0]),
              sentence: row[1],
              english: row[2],
              heisigMaxNumber: this.findMaxNumber(row[1], rtk)
            };

            try {
              rtk[ncs.heisigMaxNumber].sentences.push(ncs);
            } catch (ex) {
              console.error("Could not find number:" + ncs.heisigMaxNumber + " " + row[3]);
            }
          });

        }


        searchtext = searchtext.toLowerCase();
        var res: Array<RTKSentence> = JSON.parse(JSON.stringify(Object.values(rtk)));

        if (!v) {
          res = res.filter(c => c.sentences.length > 0);
        }
        if (searchtext.length > 0) {
          //only show sentences with results
          res.forEach(c => c.sentences = c.sentences.filter(b => b.sentence.indexOf(searchtext) > -1 || b.english.indexOf(searchtext) > -1));
          res = res.filter(c => c.sentences.length > 0);
        }

      /// debug
      var sorted: Array<RTKSentence> = JSON.parse(JSON.stringify(Object.values(rtk)))
      sorted.sort((a, b) => b.sentences.length - a.sentences.length);
      /////////////////
      
      console.log("The kanji with the most sentences is:" + sorted[0].kanji +" " + sorted[0].sentences.length);
        res = res.slice(0, resultLimit);
        res.forEach(r => r.sentences.forEach(s => s.htmlsentence = this.render(s.sentence, showFurigana)));
        return res;
      }));

    this.showNoSentenceKanji.next(false);

  }

  public findMaxNumber(sentence: string, rtk: { [id: number]: RTKSentence }): number {

    var keys = Object.keys(rtk).reverse();
    var res = 0;
    keys.some((v, i, a) => {
      var ind = parseInt(v);
      if (sentence.indexOf(rtk[ind].kanji) > -1) // contains it
      {
        res = ind;
        return true;
      } else {
        return false;
      }
    });
    return res;
  }


  public render(input: string, showFurigana: boolean) {

    var newsen = input;

    var minsenre = /[\s](.*?)\[(.*?)\]/g;
    var begsenre = /([^].*?)\[(.*?)\]/g;
    newsen = newsen.replace(minsenre, (a, b, c) => { return "<ruby>" + b + "<rt>" + (showFurigana ? c : "") + "</rt></ruby>"; });
    newsen = newsen.replace(begsenre, (a, b, c) => { return "<ruby>" + b + "<rt>" + (showFurigana ? c : "") + "</rt></ruby>"; });
    return newsen;

  }


}



export class RTK {
  kanji: string;
  keyword: string;
  number: number;
}

export class CoreSentence {
  coreIndex: number;
  sentence: string;
  english: string;
  heisigMaxNumber: number;
  htmlsentence: string;
}


export class RTKSentence extends RTK {
  public sentences: CoreSentence[];
}
