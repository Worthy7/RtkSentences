import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, combineLatest, BehaviorSubject, Observable } from 'rxjs';
import { map, debounce, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-rtk',
  templateUrl: './rtk.component.html',
  styleUrls: ['./rtk.component.scss']
})
export class RtkComponent implements OnInit {

  constructor(private http: HttpClient) { }

  rtk = new BehaviorSubject<{ [id: number]: RTKSentence }>({});
  searchText = new BehaviorSubject<string>("");

  showNoSentenceKanji = new BehaviorSubject<boolean>(false);
  filteredSentences: Observable<Array<RTKSentence>>;
  resultLimit = new BehaviorSubject<number>(10);

  ngOnInit() {
    // for speed first load in all 


    // load rtk data
    this.http.get('assets/rtk.tsv', { responseType: 'text' }).subscribe(
      (rtkdata) => {
        console.log(rtkdata);

        var rows = rtkdata.split("\n");
        var newrtk: { [id: number]: RTKSentence } = {}

        rows.forEach(srow => {
          var row = srow.split("\t");
          var n = <RTKSentence>{
            kanji: row[0],
            keyword: row[1],
            number: parseInt(row[2]),
            sentences: []
          };

          newrtk[n.number] = n;

        })

        // load sentences data
        this.http.get('assets/sentences.tsv', { responseType: 'text' }).subscribe((sentenceData) => {


          console.log(sentenceData);

          var rows = sentenceData.split("\n");

          rows.forEach(srow => {
            var row = srow.split("\t");
            var ncs = <CoreSentence>{
              coreIndex: parseInt(row[0]),
              sentence: row[1],
              english: row[2],
              heisigMaxNumber: parseInt(row[3]),
              heisigMaxKanji: row[4],
              heisigMaxKeyword: row[5],
              heisigSort: parseInt(row[6])
            };

            try {
              newrtk[ncs.heisigMaxNumber].sentences.push(ncs);
            } catch (ex) {
              console.error("Could not find number:" + ncs.heisigMaxNumber + " " + row[3]);
            }
          });


          this.rtk.next(newrtk);
        });


      });


    this.filteredSentences = combineLatest(
      this.rtk,
      this.showNoSentenceKanji,
      this.searchText.pipe(debounceTime(500)),
      this.resultLimit
    ).pipe(
      map(([s, v, st, resultLimit]) => {

        var res = JSON.parse(JSON.stringify(Object.values(s)));
        if (!v) {
          res = res.filter(c => c.sentences.length > 0);
        }
        if (st.length > 0) {
          res.forEach(c => c.sentences = c.sentences.filter(b => b.sentence.indexOf(st) > -1 || b.english.indexOf(st) > -1));
          res = res.filter(c => c.sentences.length > 0);
        }
        return res.slice(0, resultLimit);
      }));

    this.showNoSentenceKanji.next(false);
  }

  public render(input: string) {

    var newsen = input;

    var minsenre = /[\s](.*?)\[(.*?)\]/g;
    var begsenre = /([^].*?)\[(.*?)\]/g;
    newsen = newsen.replace(minsenre, (a, b, c) => { return "<ruby>" + b + "<rt>" + c + "</rt></ruby>"; });
    newsen = newsen.replace(begsenre, (a, b, c) => { return "<ruby>" + b + "<rt>" + c + "</rt></ruby>"; });
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
  heisigMaxKanji: string;
  heisigMaxKeyword: string;
  heisigSort: number;
}


export class RTKSentence extends RTK {
  public sentences: CoreSentence[];
}
