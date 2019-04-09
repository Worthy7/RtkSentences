import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, combineLatest } from 'rxjs';

@Component({
  selector: 'app-rtk',
  templateUrl: './rtk.component.html',
  styleUrls: ['./rtk.component.scss']
})
export class RtkComponent implements OnInit {

  constructor(private http: HttpClient) { }

  rtk: Array<RTK> = [];

  sentences: Array<CoreSentence> = [];

  organizedSentences: Array<RTKSentence> = [];


  ngOnInit() {

    // load rtk data
    var rtksub = this.http.get('assets/rtk.tsv', { responseType: 'text' });

    // load sentences data
    var sentencesub = this.http.get('assets/sentences.tsv', { responseType: 'text' });


    combineLatest(rtksub, sentencesub).subscribe(([rtkdata, sentenceData]) => {
      {
        console.log(rtkdata);

        var rows = rtkdata.split("\n");
        var newrtk: Array<RTK> = []

        rows.forEach(srow => {
          var row = srow.split("\t");
          newrtk.push({
            kanji: row[0],
            keyword: row[1],
            number: parseInt(row[2])
          });

        })
        this.rtk = newrtk;
      }

      {
        console.log(sentenceData);

        var rows = sentenceData.split("\n");
        var coreSentences: Array<CoreSentence> = []

        rows.forEach(srow => {
          var row = srow.split("\t");
          coreSentences.push(<CoreSentence>{
            coreIndex: parseInt(row[0]),
            sentence: row[1],
            english: row[2],
            heisigMaxNumber: parseInt(row[3]),
            heisigMaxKanji: row[4],
            heisigMaxKeyword: row[5],
            heisigSort: parseInt(row[6])
          });

        })
        this.sentences = coreSentences;
      }


      // special rtk with sentences
      {
        var organizedS: Array<RTKSentence> = []
        var rtksen: Array<RTKSentence> = [];
        this.rtk.forEach(row => {
          rtksen.push({
            kanji: row.kanji,
            keyword: row.keyword,
            number: row.number,
            sentences: this.sentences.filter(c => c.heisigMaxNumber == row.number)
          });

        })
        this.organizedSentences = rtksen;
      }
    })



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
