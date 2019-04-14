import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, combineLatest, BehaviorSubject, Observable } from 'rxjs';
import { map, debounce, debounceTime } from 'rxjs/operators';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { saveAs } from 'file-saver';

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
  ignoreKanji = new BehaviorSubject<string>(""); // 彼今気来生長私間事
  small = new BehaviorSubject(false);

  showNoSentenceKanji = new BehaviorSubject<boolean>(false);
  showFurigana = new BehaviorSubject<boolean>(true);
  filteredSentences = new BehaviorSubject<Array<RTKSentence>>([]);
  limitedSentences = new BehaviorSubject<Array<RTKSentence>>([]);
  resultLimit = new BehaviorSubject<number>(100);
  kanjilist$ = new BehaviorSubject<string>("common");


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


    combineLatest(
      getrtk,
      getsentences,
      this.showNoSentenceKanji.pipe(debounceTime(1000)),
      this.searchText.pipe(debounceTime(1000)),
      this.ignoreKanji.pipe(debounceTime(1000)),
      this.kanjilist$
    ).pipe(
      map(([rtkdata, sentenceData, v, searchtext, ignorekanji, source]
        : [string, string, boolean, string, string, string]) => {

        var rtk: { [id: number]: RTKSentence } = {}
        // read rtk if rtk
        if (source == "rtk") {
          rtk = this.getKanjiListFromRTK(rtkdata);
        } else {
          rtk = this.getKanjiListFromSentences(sentenceData);
        }

        // exclude if in the mix
        ignorekanji.split("").forEach(k => {
          Object.keys(rtk).forEach(c => {
            if (rtk[parseInt(c)].kanji == k) delete rtk[parseInt(c)];
          });
        });


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

        // sort the sentences
        Object.values(rtk).forEach(c => c.sentences.sort((a, b) => {
          // this is advanced because it needs to subsort too.

          var tries = 0;
          var res = this.findMaxNumber(a.sentence, rtk, tries) - this.findMaxNumber(b.sentence, rtk, tries)
          while (res == 0 && tries < 5) {
            tries++;
            res = this.findMaxNumber(a.sentence, rtk, tries) - this.findMaxNumber(b.sentence, rtk, tries)
          }
          return res;
        }
        ));


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

        console.log("The kanji with the most sentences is:" + sorted[0].kanji + " " + sorted[0].sentences.length);
        return res;
      })).subscribe(this.filteredSentences);

    this.showNoSentenceKanji.next(false);

    combineLatest(
      this.resultLimit.pipe(debounceTime(1000)), this.filteredSentences, this.showFurigana).pipe(map(([rl, fs, showFurigana]: [number, RTKSentence[], boolean]) => {
        var nres = fs.slice(0, rl);
        nres.forEach(r => r.sentences.forEach(s => s.htmlsentence = this.render(s.sentence, showFurigana)));
        return nres;
      })).subscribe(this.limitedSentences);


  }


  public getKanjiListFromRTK(rtkdata: string): { [id: number]: RTKSentence } {
    console.log("Loading rtk...");
    var rtk: { [id: number]: RTKSentence } = {};
    var rows = rtkdata.split("\n");

    rows.forEach(srow => {
      var row = srow.split("\t");
      var n = <RTKSentence>{
        kanji: row[0],
        keyword: row[1],
        number: parseInt(row[2]),
        sentences: []
      };
    })
    return rtk;
  }


  public getKanjiListFromSentences(sentenceData: string): { [id: number]: RTKSentence } {
    console.log("Loading rtk...");
    var rtk: { [id: number]: RTKSentence } = {};
    // look through all the sentences /////////////
    var sebrows = sentenceData.split("\n");
    // for some reason the last sentence is broken.
    sebrows.pop();

    var kanjiobj = {};
    sebrows.forEach(srow => {
      var row = srow.split("\t");
      row[1].split("").forEach(c => {
        if (kanjiobj[c]) kanjiobj[c]++;
        else kanjiobj[c] = 1;
      })

    })

    var kanjikeys = Object.keys(kanjiobj)
    kanjikeys.sort((a, b) => kanjiobj[b] - kanjiobj[a]);

    kanjikeys.forEach((v, i, s) => {
      rtk[i] = <RTKSentence>{
        kanji: v,
        keyword: "",
        number: i,
        sentences: []
      };
    });


    return rtk;
  }


  public findMaxNumber(sentence: string, rtk: { [id: number]: RTKSentence }, max = 0): number {

    var keys = Object.keys(rtk).reverse();
    var res = 0;
    var resnum = 0;
    keys.some((v, i, a) => {
      var ind = parseInt(v);
      if (sentence.indexOf(rtk[ind].kanji) > -1) // contains it
      {
        if (resnum >= max) {
          res = ind;
          return true;
        } else {
          resnum++;
        }
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

  public export() {

    // output format should be:
    /////////////////
    // coreindex
    // sentence
    // translation
    // heisigMaxNumber
    // HeisigMaxKanji
    // HeisigMaxKeyword
    // HeisigSort

    var forexport: exportrow[] = [];

    this.filteredSentences.value.forEach(rtk => {
      rtk.sentences.forEach(sentence =>
        forexport.push(<exportrow>{
          acoreIndex: sentence.coreIndex,
          bsentence: sentence.sentence,
          cenglish: sentence.english,
          dheisigMaxNumber: rtk.number,
          eheisigMaxKanji: rtk.kanji,
          fheisigMaxKeyword: rtk.keyword,
        })
      );
    })

    // add index
    forexport.forEach((v, i, a) => v.gheisigSort = i);

    var stringed = forexport.map(v => Object.values(v).join("\t")).join("\n");
    var blob = new Blob([stringed], { type: 'text/tsv' })
    saveAs(blob, "rt10k.tsv");
  }

}

export class exportrow {
  acoreIndex: number;
  bsentence: string;
  cenglish: string;
  dheisigMaxNumber: number;
  eheisigMaxKanji: string;
  fheisigMaxKeyword: string;
  gheisigSort: number;
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
